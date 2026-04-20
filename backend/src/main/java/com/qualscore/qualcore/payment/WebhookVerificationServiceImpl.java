package com.qualscore.qualcore.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.audit.AuditEventType;
import com.qualscore.qualcore.audit.AuditLogService;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import com.qualscore.qualcore.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Production-grade webhook processor for inbound payment gateway events.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PROCESSING PIPELINE
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Signature verification  → reject immediately if invalid (prevents spoofing)
 * 2. Idempotency check       → if gatewayEventId already recorded, return ALREADY_PROCESSED
 * 3. Event type routing      → only handle payment.captured / payment_success events
 * 4. Locate transaction      → look up by gatewayOrderId
 * 5. State guard             → skip if already VERIFIED (idempotent state machine)
 * 6. Persist                 → update status, record webhook event ID + raw payload + verifiedAt
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GATEWAY EVENT TYPE MAPPING
 * ─────────────────────────────────────────────────────────────────────────
 * Razorpay:
 *   Captured event:   event.entity = "payment.captured"
 *   Order ID path:    payload.payment.entity.order_id
 *   Payment ID path:  payload.payment.entity.id
 *   Event ID header:  X-Razorpay-Event-Id  (deduplicate on this)
 *
 * PayU:
 *   Captured event:   status = "success"
 *   Order ID path:    txnid
 *   Payment ID path:  mihpayid
 *   Event ID field:   mihpayid (use as dedup key)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TRANSACTION log:
 *   Logs every webhook at INFO.
 *   Logs duplicate events at DEBUG (not WARN — duplicates are normal).
 *   Logs signature failures at WARN.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookVerificationServiceImpl implements WebhookVerificationService {

    private final PaymentGatewayClient gatewayClient;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public WebhookProcessingResult processWebhookEvent(byte[] rawPayload,
                                                        String signatureHeader,
                                                        String gatewayEventId) {
        log.info("[Webhook] Inbound event: gateway={} eventId={}", gatewayClient.gatewayName(), gatewayEventId);

        if (!gatewayClient.verifyWebhookSignature(rawPayload, signatureHeader)) {
            log.warn("[Webhook] Signature INVALID: gateway={} eventId={}", gatewayClient.gatewayName(), gatewayEventId);
            auditLogService.failure(AuditEventType.WEBHOOK_INVALID, "GATEWAY",
                    "WebhookEvent", gatewayEventId,
                    Map.of("gateway", gatewayClient.gatewayName(), "eventId", gatewayEventId));
            return WebhookProcessingResult.signatureInvalid(gatewayEventId);
        }

        if (isAlreadyProcessed(gatewayEventId)) {
            log.debug("[Webhook] Duplicate event skipped: eventId={}", gatewayEventId);
            auditLogService.skipped(AuditEventType.WEBHOOK_DUPLICATE, "GATEWAY",
                    "WebhookEvent", gatewayEventId,
                    Map.of("gateway", gatewayClient.gatewayName()));
            return WebhookProcessingResult.alreadyProcessed(gatewayEventId);
        }

        String rawBody = new String(rawPayload, StandardCharsets.UTF_8);

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String eventType = extractEventType(root);

            if (!isPaymentCapturedEvent(eventType)) {
                log.info("[Webhook] Non-capture event ignored: type={} eventId={}", eventType, gatewayEventId);
                return WebhookProcessingResult.processed(gatewayEventId, null);
            }

            String gatewayOrderId = extractOrderId(root);
            String gatewayPaymentId = extractPaymentId(root);

            if (gatewayOrderId == null || gatewayOrderId.isBlank()) {
                log.warn("[Webhook] Could not extract gatewayOrderId from payload. eventId={}", gatewayEventId);
                return WebhookProcessingResult.failed(gatewayEventId, "Missing gatewayOrderId in webhook payload");
            }

            Optional<PaymentTransaction> txOpt = paymentTransactionRepository.findByGatewayOrderId(gatewayOrderId);
            if (txOpt.isEmpty()) {
                log.warn("[Webhook] No transaction found for gatewayOrderId={}", gatewayOrderId);
                return WebhookProcessingResult.failed(gatewayEventId, "Transaction not found: " + gatewayOrderId);
            }

            PaymentTransaction tx = txOpt.get();

            if (tx.getStatus() == PaymentTransactionStatus.VERIFIED
                    || tx.getStatus() == PaymentTransactionStatus.SUCCESS) {
                log.debug("[Webhook] Transaction already in terminal state: ref={} status={}",
                        tx.getPaymentReference(), tx.getStatus());
                recordWebhookEventId(tx, gatewayEventId, rawBody);
                return WebhookProcessingResult.alreadyProcessed(gatewayEventId);
            }

            tx.setStatus(PaymentTransactionStatus.VERIFIED);
            tx.setGatewayPaymentId(gatewayPaymentId);
            tx.setWebhookEventId(gatewayEventId);
            tx.setRawPayload(rawBody);
            tx.setVerifiedAt(OffsetDateTime.now());
            paymentTransactionRepository.save(tx);

            auditLogService.success(AuditEventType.WEBHOOK_RECEIVED, "GATEWAY",
                    "PaymentTransaction", tx.getPaymentReference(),
                    Map.of("gateway", gatewayClient.gatewayName(),
                            "eventId", gatewayEventId,
                            "orderId", gatewayOrderId,
                            "paymentId", gatewayPaymentId != null ? gatewayPaymentId : ""));

            log.info("[Webhook] Payment captured and verified: ref={} orderId={} paymentId={}",
                    tx.getPaymentReference(), gatewayOrderId, gatewayPaymentId);

            return WebhookProcessingResult.processed(gatewayEventId, gatewayOrderId);

        } catch (Exception e) {
            log.error("[Webhook] Failed to process event: eventId={} error={}", gatewayEventId, e.getMessage(), e);
            return WebhookProcessingResult.failed(gatewayEventId, e.getMessage());
        }
    }

    private boolean isAlreadyProcessed(String gatewayEventId) {
        if (gatewayEventId == null || gatewayEventId.isBlank()) return false;
        return paymentTransactionRepository.existsByWebhookEventId(gatewayEventId);
    }

    private void recordWebhookEventId(PaymentTransaction tx, String gatewayEventId, String rawBody) {
        if (tx.getWebhookEventId() == null) {
            tx.setWebhookEventId(gatewayEventId);
            tx.setRawPayload(rawBody);
            paymentTransactionRepository.save(tx);
        }
    }

    private String extractEventType(JsonNode root) {
        if (root.has("event")) return root.get("event").asText("");
        if (root.has("status")) return root.get("status").asText("");
        return "unknown";
    }

    private boolean isPaymentCapturedEvent(String eventType) {
        return "payment.captured".equals(eventType)
                || "payment_success".equals(eventType)
                || "success".equalsIgnoreCase(eventType);
    }

    private String extractOrderId(JsonNode root) {
        if (root.path("payload").path("payment").path("entity").has("order_id")) {
            return root.path("payload").path("payment").path("entity").get("order_id").asText(null);
        }
        if (root.has("txnid")) return root.get("txnid").asText(null);
        if (root.has("order_id")) return root.get("order_id").asText(null);
        return null;
    }

    private String extractPaymentId(JsonNode root) {
        if (root.path("payload").path("payment").path("entity").has("id")) {
            return root.path("payload").path("payment").path("entity").get("id").asText(null);
        }
        if (root.has("mihpayid")) return root.get("mihpayid").asText(null);
        if (root.has("razorpay_payment_id")) return root.get("razorpay_payment_id").asText(null);
        return null;
    }
}
