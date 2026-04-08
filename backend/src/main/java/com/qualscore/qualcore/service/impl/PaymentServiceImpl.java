package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.dto.request.InitiatePaymentRequest;
import com.qualscore.qualcore.dto.request.VerifyPaymentRequest;
import com.qualscore.qualcore.dto.response.InitiatePaymentResponse;
import com.qualscore.qualcore.dto.response.VerifyPaymentResponse;
import com.qualscore.qualcore.exception.PaymentVerificationException;
import com.qualscore.qualcore.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    @Value("${integrations.razorpay.key-id:#{null}}")
    private String razorpayKeyId;

    @Value("${integrations.razorpay.key-secret:#{null}}")
    private String razorpayKeySecret;

    @Override
    public InitiatePaymentResponse initiatePayment(InitiatePaymentRequest request) {
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        log.info("Payment initiation stub: amount={}, currency={}", request.getAmount(), request.getCurrency());

        return InitiatePaymentResponse.builder()
                .orderId(orderId)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .keyId(razorpayKeyId != null ? razorpayKeyId : "key_test_stub")
                .build();
    }

    @Override
    public VerifyPaymentResponse verifyPayment(VerifyPaymentRequest request) {
        if (razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            log.warn("Razorpay key secret not configured — skipping HMAC verification (stub mode)");
            return buildVerifiedResponse(request);
        }

        String payload = request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId();
        boolean valid = verifyHmacSha256(payload, request.getRazorpaySignature(), razorpayKeySecret);

        if (!valid) {
            throw new PaymentVerificationException("Payment signature verification failed");
        }

        log.info("Payment verified: paymentId={}", request.getRazorpayPaymentId());
        return buildVerifiedResponse(request);
    }

    private VerifyPaymentResponse buildVerifiedResponse(VerifyPaymentRequest request) {
        return VerifyPaymentResponse.builder()
                .verified(true)
                .paymentId(request.getRazorpayPaymentId())
                .orderId(request.getRazorpayOrderId())
                .capturedAt(OffsetDateTime.now().toString())
                .build();
    }

    private boolean verifyHmacSha256(String data, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return computedHex.equals(signature);
        } catch (Exception e) {
            log.error("HMAC verification failed", e);
            return false;
        }
    }
}
