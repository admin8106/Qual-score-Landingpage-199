package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.audit.AuditEventType;
import com.qualscore.qualcore.audit.AuditLogService;
import com.qualscore.qualcore.dto.request.PaymentInitiateRequest;
import com.qualscore.qualcore.dto.request.PaymentVerifyRequest;
import com.qualscore.qualcore.dto.response.PaymentInitiateResponse;
import com.qualscore.qualcore.dto.response.PaymentStatusResponse;
import com.qualscore.qualcore.dto.response.PaymentVerifyResponse;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.exception.PaymentVerificationException;
import com.qualscore.qualcore.payment.CheckoutType;
import com.qualscore.qualcore.payment.CreateOrderRequest;
import com.qualscore.qualcore.payment.GatewayOrderResult;
import com.qualscore.qualcore.payment.PayUOrderData;
import com.qualscore.qualcore.payment.PaymentGatewayClient;
import com.qualscore.qualcore.payment.SignatureVerificationRequest;
import com.qualscore.qualcore.repository.PaymentTransactionRepository;
import com.qualscore.qualcore.service.PaymentWorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Orchestrates the full payment lifecycle for the diagnostic funnel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STATE MACHINE
 * ─────────────────────────────────────────────────────────────────────────
 *   INITIATED → VERIFIED    (via /verify or webhook)
 *   INITIATED → FAILED      (signature check failed)
 *   VERIFIED  → (terminal)
 *   FAILED    → (terminal — new initiation required)
 *
 * RACE CONDITION HANDLING
 *   Both /verify and /webhook may arrive at near the same time.
 *   Handled by:
 *     - Optimistic state guard (isVerified() / isFailed() checks before update)
 *     - DB UNIQUE constraint on webhookEventId prevents duplicate webhook processing
 *     - Idempotent /verify: returns the existing verified state if already done
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PROVIDER-SPECIFIC BEHAVIOUR
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RAZORPAY (checkoutType = RAZORPAY_MODAL):
 *   initiate:  calls createOrder → returns gatewayOrderId, keyId, amountPaise
 *   verify:    verifySignature with HMAC-SHA256(orderId|paymentId, keySecret)
 *   webhook:   JSON body, X-Razorpay-Signature header, HMAC-SHA256(body, webhookSecret)
 *
 * PAYU (checkoutType = PAYU_FORM):
 *   initiate:  computes forward hash → returns payuData (form POST fields)
 *   verify:    verifySignature with SHA-512(salt|status|udf5|...|txnid|key)
 *              signaturePayload MUST be provided by the frontend
 *   webhook:   form-encoded POST, hash field inside body, SHA-512 reverse hash
 *
 * MOCK (checkoutType = MOCK):
 *   All operations succeed immediately. Used in dev/test.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWorkflowServiceImpl implements PaymentWorkflowService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentGatewayClient gatewayClient;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public PaymentInitiateResponse initiate(PaymentInitiateRequest request) {
        String paymentReference = generatePaymentReference();

        CreateOrderRequest orderRequest = new CreateOrderRequest(
                paymentReference,
                request.getAmountPaise(),
                request.getCurrency() != null ? request.getCurrency() : "INR",
                request.getCandidateName(),
                request.getEmail(),
                null,
                "QualScore Employability Diagnostic",
                null
        );

        GatewayOrderResult orderResult = gatewayClient.createOrder(orderRequest);

        BigDecimal amount = BigDecimal.valueOf(request.getAmountPaise()).movePointLeft(2);

        PaymentTransaction transaction = PaymentTransaction.builder()
                .paymentReference(paymentReference)
                .gatewayName(gatewayClient.gatewayName())
                .amount(amount)
                .currency(orderRequest.currency())
                .gatewayOrderId(orderResult.gatewayOrderId())
                .gatewayOrderRawResponse(orderResult.rawResponse())
                .status(PaymentTransactionStatus.INITIATED)
                .build();

        paymentTransactionRepository.save(transaction);

        auditLogService.success(
                AuditEventType.PAYMENT_INITIATED,
                request.getEmail() != null ? request.getEmail() : "anonymous",
                "PaymentTransaction",
                paymentReference,
                Map.of(
                        "gateway", gatewayClient.gatewayName(),
                        "amountPaise", request.getAmountPaise(),
                        "currency", orderRequest.currency(),
                        "gatewayOrderId", orderResult.gatewayOrderId()));

        log.info("[Payment] Initiated: ref={} gateway={} orderId={} amountPaise={}",
                paymentReference, gatewayClient.gatewayName(),
                orderResult.gatewayOrderId(), request.getAmountPaise());

        CheckoutType checkoutType = resolveCheckoutType();
        PayUOrderData payuData = checkoutType == CheckoutType.PAYU_FORM
                ? parsePayUOrderData(orderResult.rawResponse())
                : null;

        return PaymentInitiateResponse.builder()
                .paymentReference(paymentReference)
                .gatewayOrderId(orderResult.gatewayOrderId())
                .amountPaise(request.getAmountPaise())
                .currency(orderRequest.currency())
                .keyId(gatewayClient.publicKey())
                .provider(gatewayClient.gatewayName())
                .checkoutType(checkoutType)
                .payuData(payuData)
                .createdAt(OffsetDateTime.now().toString())
                .build();
    }

    @Override
    @Transactional
    public PaymentVerifyResponse verify(PaymentVerifyRequest request) {
        PaymentTransaction transaction = paymentTransactionRepository
                .findByGatewayOrderId(request.getGatewayOrderId())
                .orElseThrow(() -> new BusinessException(
                        "PAYMENT_NOT_FOUND",
                        "No payment record found for gatewayOrderId: " + request.getGatewayOrderId(),
                        HttpStatus.NOT_FOUND));

        if (transaction.isVerified()) {
            log.info("[Payment] Already verified — idempotent return: ref={}", transaction.getPaymentReference());
            auditLogService.skipped(
                    AuditEventType.PAYMENT_VERIFIED,
                    transaction.getPaymentReference(),
                    "PaymentTransaction",
                    transaction.getPaymentReference(),
                    Map.of("reason", "ALREADY_VERIFIED", "gateway", gatewayClient.gatewayName()));
            return buildVerifyResponse(transaction);
        }

        if (transaction.isFailed()) {
            auditLogService.failure(
                    AuditEventType.PAYMENT_FAILED,
                    transaction.getPaymentReference(),
                    "PaymentTransaction",
                    transaction.getPaymentReference(),
                    Map.of("reason", "ALREADY_FAILED"));
            throw new BusinessException(
                    "PAYMENT_FAILED",
                    "This payment has already failed. Please initiate a new payment.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        SignatureVerificationRequest sigRequest = buildSignatureVerificationRequest(request);

        boolean valid = gatewayClient.verifySignature(sigRequest);

        if (!valid) {
            transaction.setStatus(PaymentTransactionStatus.FAILED);
            paymentTransactionRepository.save(transaction);
            auditLogService.failure(
                    AuditEventType.PAYMENT_FAILED,
                    transaction.getPaymentReference(),
                    "PaymentTransaction",
                    transaction.getPaymentReference(),
                    Map.of("reason", "SIGNATURE_INVALID", "gateway", gatewayClient.gatewayName(),
                            "orderId", request.getGatewayOrderId()));
            log.warn("[Payment] Signature FAILED: ref={} orderId={}",
                    transaction.getPaymentReference(), request.getGatewayOrderId());
            throw new PaymentVerificationException(
                    "Payment signature verification failed for orderId: " + request.getGatewayOrderId());
        }

        transaction.setStatus(PaymentTransactionStatus.VERIFIED);
        transaction.setGatewayPaymentId(request.getGatewayPaymentId());
        transaction.setGatewaySignature(request.getGatewaySignature());
        transaction.setVerifiedAt(OffsetDateTime.now());
        paymentTransactionRepository.save(transaction);

        auditLogService.success(
                AuditEventType.PAYMENT_VERIFIED,
                transaction.getPaymentReference(),
                "PaymentTransaction",
                transaction.getPaymentReference(),
                Map.of("gateway", gatewayClient.gatewayName(),
                        "gatewayPaymentId", request.getGatewayPaymentId(),
                        "orderId", request.getGatewayOrderId()));

        log.info("[Payment] Verified: ref={} gateway={} paymentId={}",
                transaction.getPaymentReference(), gatewayClient.gatewayName(), request.getGatewayPaymentId());

        return buildVerifyResponse(transaction);
    }

    public boolean isPaymentVerified(String paymentReference) {
        return paymentTransactionRepository.findByPaymentReference(paymentReference)
                .map(PaymentTransaction::isVerified)
                .orElse(false);
    }

    private SignatureVerificationRequest buildSignatureVerificationRequest(PaymentVerifyRequest request) {
        String gatewayName = gatewayClient.gatewayName();

        if ("PAYU".equals(gatewayName)) {
            return new SignatureVerificationRequest(
                    request.getGatewayOrderId(),
                    request.getGatewayPaymentId(),
                    request.getGatewaySignature(),
                    request.getSignaturePayload() != null ? request.getSignaturePayload() : ""
            );
        }

        return new SignatureVerificationRequest(
                request.getGatewayOrderId(),
                request.getGatewayPaymentId(),
                request.getGatewaySignature(),
                request.getGatewayOrderId() + "|" + request.getGatewayPaymentId()
        );
    }

    private CheckoutType resolveCheckoutType() {
        return switch (gatewayClient.gatewayName()) {
            case "RAZORPAY" -> CheckoutType.RAZORPAY_MODAL;
            case "PAYU"     -> CheckoutType.PAYU_FORM;
            default         -> CheckoutType.MOCK;
        };
    }

    private PayUOrderData parsePayUOrderData(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) return null;
        try {
            Map<String, String> map = objectMapper.readValue(rawResponse, new TypeReference<>() {});
            return new PayUOrderData(
                    map.getOrDefault("txnid", ""),
                    map.getOrDefault("key", ""),
                    map.getOrDefault("amount", ""),
                    map.getOrDefault("productinfo", ""),
                    map.getOrDefault("firstname", ""),
                    map.getOrDefault("email", ""),
                    map.getOrDefault("hash", ""),
                    map.getOrDefault("udf1", ""),
                    map.getOrDefault("udf2", ""),
                    map.getOrDefault("udf3", ""),
                    map.getOrDefault("udf4", ""),
                    map.getOrDefault("udf5", ""),
                    map.getOrDefault("baseUrl", "")
            );
        } catch (Exception e) {
            log.warn("[PayU] Failed to parse checkout params from rawResponse: {}", e.getMessage());
            return null;
        }
    }

    private PaymentVerifyResponse buildVerifyResponse(PaymentTransaction tx) {
        return PaymentVerifyResponse.builder()
                .verified(tx.isVerified())
                .paymentReference(tx.getPaymentReference())
                .gatewayOrderId(tx.getGatewayOrderId())
                .gatewayPaymentId(tx.getGatewayPaymentId())
                .status(tx.getStatus())
                .verifiedAt(tx.getVerifiedAt() != null ? tx.getVerifiedAt().toString() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse getStatus(String paymentReference) {
        return paymentTransactionRepository
                .findByPaymentReference(paymentReference)
                .map(tx -> PaymentStatusResponse.builder()
                        .paymentReference(tx.getPaymentReference())
                        .verified(tx.isVerified())
                        .status(tx.getStatus().name())
                        .gatewayOrderId(tx.getGatewayOrderId())
                        .verifiedAt(tx.getVerifiedAt() != null ? tx.getVerifiedAt().toString() : null)
                        .build())
                .orElseGet(() -> {
                    log.warn("[Payment] Status check for unknown paymentReference={}", paymentReference);
                    return PaymentStatusResponse.builder()
                            .paymentReference(paymentReference)
                            .verified(false)
                            .status("UNKNOWN")
                            .gatewayOrderId(null)
                            .verifiedAt(null)
                            .build();
                });
    }

    private String generatePaymentReference() {
        return "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase();
    }
}
