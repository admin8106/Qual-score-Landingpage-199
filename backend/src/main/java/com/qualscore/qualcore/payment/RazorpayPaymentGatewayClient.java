package com.qualscore.qualcore.payment;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * Production Razorpay gateway client.
 *
 * Active when: integrations.payment.provider=razorpay
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REQUIRED ENVIRONMENT VARIABLES
 * ─────────────────────────────────────────────────────────────────────────
 *   RAZORPAY_KEY_ID          rzp_live_xxxx  (or rzp_test_xxxx for test mode)
 *   RAZORPAY_KEY_SECRET      your key secret (NEVER commit this)
 *   RAZORPAY_WEBHOOK_SECRET  webhook signing secret from Razorpay Dashboard
 *   INTEGRATIONS_PAYMENT_PROVIDER=razorpay
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RAZORPAY DASHBOARD SETUP
 * ─────────────────────────────────────────────────────────────────────────
 *   1. Dashboard → Settings → API Keys → Generate Key (copy Key ID + Secret)
 *   2. Dashboard → Webhooks → Add Webhook:
 *        URL:    https://api.qualscore.in/api/v1/payments/webhook
 *        Events: payment.captured
 *        Secret: choose a random string → set as RAZORPAY_WEBHOOK_SECRET
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIGNATURE ALGORITHMS
 * ─────────────────────────────────────────────────────────────────────────
 *   Client callback: HMAC-SHA256(gatewayOrderId + "|" + gatewayPaymentId, keySecret)
 *   Webhook:         HMAC-SHA256(rawBody, webhookSecret)
 *   Both produce lowercase hex strings.
 */
@Slf4j
@Component("razorpayPaymentGatewayClient")
@Qualifier("razorpayPaymentGatewayClient")
public class RazorpayPaymentGatewayClient implements PaymentGatewayClient {

    @Value("${integrations.razorpay.key-id:}")
    private String keyId;

    @Value("${integrations.razorpay.key-secret:}")
    private String keySecret;

    @Value("${integrations.razorpay.webhook-secret:}")
    private String webhookSecret;

    static RazorpayPaymentGatewayClient withCredentials(String keyId, String keySecret, String webhookSecret) {
        RazorpayPaymentGatewayClient client = new RazorpayPaymentGatewayClient();
        client.keyId = keyId != null ? keyId : "";
        client.keySecret = keySecret != null ? keySecret : "";
        client.webhookSecret = webhookSecret != null ? webhookSecret : "";
        return client;
    }

    @Override
    public String gatewayName() {
        return "RAZORPAY";
    }

    @Override
    public GatewayOrderResult createOrder(CreateOrderRequest request) {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            log.warn("[Razorpay] Key ID or Key Secret not configured — falling back to stub order");
            return createStubOrder(request);
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", request.amountPaise());
            orderRequest.put("currency", request.currency() != null ? request.currency() : "INR");
            orderRequest.put("receipt", request.internalReference());

            JSONObject notes = new JSONObject();
            if (request.candidateName() != null && !request.candidateName().isBlank()) {
                notes.put("candidate_name", request.candidateName());
            }
            if (request.candidateEmail() != null && !request.candidateEmail().isBlank()) {
                notes.put("candidate_email", request.candidateEmail());
            }
            notes.put("product", request.productDescription() != null
                    ? request.productDescription()
                    : "QualScore Diagnostic");
            orderRequest.put("notes", notes);

            Order order = client.orders.create(orderRequest);
            String gatewayOrderId = order.get("id");
            String rawResponse = order.toJson().toString();

            log.info("[Razorpay] Order created: ref={} orderId={} amountPaise={}",
                    request.internalReference(), gatewayOrderId, request.amountPaise());

            return new GatewayOrderResult(gatewayOrderId, rawResponse);

        } catch (RazorpayException e) {
            log.error("[Razorpay] Order creation failed: ref={} error={}",
                    request.internalReference(), e.getMessage(), e);
            throw new PaymentGatewayException("RAZORPAY", "Order creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean verifySignature(SignatureVerificationRequest request) {
        if (keySecret == null || keySecret.isBlank()) {
            log.error("[Razorpay] Key secret not configured — signature verification REJECTED (fail-safe). " +
                    "Set RAZORPAY_KEY_SECRET or configure credentials via the admin payment dashboard.");
            return false;
        }
        String payload = request.gatewayOrderId() + "|" + request.gatewayPaymentId();
        boolean valid = hmacSha256Matches(payload, request.gatewaySignature(), keySecret);
        if (!valid) {
            log.warn("[Razorpay] Signature mismatch: orderId={} paymentId={}",
                    request.gatewayOrderId(), request.gatewayPaymentId());
        }
        return valid;
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("[Razorpay] Webhook secret not configured — webhook signature REJECTED (fail-safe). " +
                    "Set RAZORPAY_WEBHOOK_SECRET or configure via the admin payment dashboard.");
            return false;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("[Razorpay] Missing X-Razorpay-Signature header on webhook");
            return false;
        }
        String body = new String(rawPayload, StandardCharsets.UTF_8);
        boolean valid = hmacSha256Matches(body, signatureHeader, webhookSecret);
        if (!valid) {
            log.warn("[Razorpay] Webhook signature mismatch: provided={}...",
                    signatureHeader.substring(0, Math.min(12, signatureHeader.length())));
        }
        return valid;
    }

    @Override
    public String publicKey() {
        return keyId != null && !keyId.isBlank() ? keyId : "";
    }

    private GatewayOrderResult createStubOrder(CreateOrderRequest request) {
        String stubOrderId = "rzp_stub_" + request.internalReference().substring(0, 8).toLowerCase();
        String rawResponse = """
                {"id":"%s","amount":%d,"currency":"%s","status":"created","receipt":"%s"}
                """.formatted(stubOrderId, request.amountPaise(),
                        request.currency() != null ? request.currency() : "INR",
                        request.internalReference()).strip();
        log.warn("[Razorpay] STUB order (credentials not set): ref={} orderId={}",
                request.internalReference(), stubOrderId);
        return new GatewayOrderResult(stubOrderId, rawResponse);
    }

    private boolean hmacSha256Matches(String data, String expectedHex, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return computedHex.equals(expectedHex);
        } catch (Exception e) {
            log.error("[Razorpay] HMAC-SHA256 computation failed", e);
            return false;
        }
    }
}
