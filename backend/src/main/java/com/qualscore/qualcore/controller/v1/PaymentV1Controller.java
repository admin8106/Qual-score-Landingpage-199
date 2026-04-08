package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.request.PaymentInitiateRequest;
import com.qualscore.qualcore.dto.request.PaymentVerifyRequest;
import com.qualscore.qualcore.dto.request.WebhookPaymentRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.PaymentInitiateResponse;
import com.qualscore.qualcore.dto.response.PaymentStatusResponse;
import com.qualscore.qualcore.dto.response.PaymentVerifyResponse;
import com.qualscore.qualcore.dto.response.WebhookPaymentResponse;
import com.qualscore.qualcore.payment.WebhookProcessingResult;
import com.qualscore.qualcore.payment.WebhookVerificationService;
import com.qualscore.qualcore.service.PaymentWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

/**
 * Payment API — v1
 *
 * Endpoints:
 *   POST /api/v1/payments/initiate  — create order, return gateway params to frontend
 *   POST /api/v1/payments/verify    — verify frontend callback signature
 *   POST /api/v1/payments/webhook   — receive server-to-server gateway notifications
 *
 * ─────────────────────────────────────────────────────────────────────────
 * URL mapping:
 *   SecurityConfig permits /api/v1/payments/** without auth.
 *   The webhook endpoint is intentionally public — gateway IP allowlisting
 *   and signature verification serve as the authentication mechanism.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment v1", description = "Payment initiation, verification, and webhook processing")
public class PaymentV1Controller {

    private final PaymentWorkflowService paymentWorkflowService;
    private final WebhookVerificationService webhookVerificationService;

    /**
     * Creates a gateway order and returns all parameters needed by the frontend
     * to initialise the payment widget (Razorpay Checkout / PayU SDK).
     *
     * Frontend flow:
     *   1. Call /initiate → receive { gatewayOrderId, keyId, amountPaise, paymentReference }
     *   2. Open gateway checkout widget with those params
     *   3. On success callback → call /verify with the gateway-returned IDs + signature
     */
    @PostMapping("/initiate")
    @Operation(
        summary = "Initiate payment",
        description = "Creates a payment order via the configured gateway. Returns gateway order ID and public key " +
                      "required to initialise the frontend payment widget. Amount must be in paise (INR × 100)."
    )
    public ResponseEntity<ApiResponse<PaymentInitiateResponse>> initiate(
            @Valid @RequestBody PaymentInitiateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(paymentWorkflowService.initiate(request)));
    }

    /**
     * Verifies the payment callback from the frontend.
     *
     * The frontend calls this immediately after the gateway checkout widget signals success.
     * The service verifies the HMAC signature, marks the transaction as VERIFIED, and returns
     * the paymentReference that the frontend must include in the subsequent profile creation call.
     *
     * Idempotent: safe to call multiple times for the same payment (e.g. on retry).
     */
    @PostMapping("/verify")
    @Operation(
        summary = "Verify payment signature",
        description = "Verifies the HMAC signature returned by the gateway after payment capture. " +
                      "Marks the transaction as VERIFIED and returns the paymentReference required for profile creation. " +
                      "Idempotent — safe to call multiple times for the same payment."
    )
    public ResponseEntity<ApiResponse<PaymentVerifyResponse>> verify(
            @Valid @RequestBody PaymentVerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(paymentWorkflowService.verify(request)));
    }

    /**
     * Returns the current server-side status of a payment.
     *
     * Used by the frontend recovery flow: after a redirect or network error during /verify,
     * the frontend calls this to check whether the backend has already recorded a VERIFIED
     * state (e.g. via webhook) before asking the user to retry.
     *
     * Always safe to call — read-only, never modifies payment state.
     * Returns a synthetic UNKNOWN status when the reference is not found, so the frontend
     * can surface the 'payment status unclear' screen with support contact details.
     */
    @GetMapping("/status/{paymentReference}")
    @Operation(
        summary = "Get payment status",
        description = "Read-only status check for a payment by its internal reference. " +
                      "Used by the frontend recovery flow after network errors or page refreshes. " +
                      "Returns UNKNOWN status when the reference is not found rather than 404."
    )
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getStatus(
            @PathVariable String paymentReference) {
        return ResponseEntity.ok(ApiResponse.success(paymentWorkflowService.getStatus(paymentReference)));
    }

    /**
     * Receives server-to-server webhook events from the payment gateway.
     *
     * ─────────────────────────────────────────────────────────────────────
     * CRITICAL: The raw request body MUST be read as bytes before any
     * other processing. Spring's HttpServletRequest.getInputStream() can
     * only be consumed once. The bytes are passed to the verification service
     * which re-computes the HMAC over them.
     *
     * Do NOT pass a parsed/deserialized body — the HMAC must be computed
     * over the exact bytes received from the gateway.
     * ─────────────────────────────────────────────────────────────────────
     *
     * Idempotency:
     *   The gateway-supplied event ID (X-Razorpay-Event-Id) is stored in
     *   the DB with a UNIQUE constraint. Duplicate deliveries are detected
     *   in the service layer and acknowledged with HTTP 200 + status "duplicate".
     *
     * Response contract:
     *   Always return HTTP 200. Any non-2xx response causes the gateway to
     *   retry, which is expensive and can cause duplicate processing.
     *   Use the response body's "status" field to indicate the outcome.
     *
     * Gateway configuration:
     *   Razorpay:  Dashboard → Webhooks → add URL + select "payment.captured" event
     *   PayU:      Dashboard → Payment Notification URL
     */
    @PostMapping("/webhook")
    @Operation(
        summary = "Receive gateway webhook",
        description = "Server-to-server endpoint for payment gateway event notifications. " +
                      "Validates the signature header and processes payment capture events idempotently. " +
                      "Always returns HTTP 200 — gateway retries are triggered only on non-2xx responses."
    )
    public ResponseEntity<WebhookPaymentResponse> webhook(HttpServletRequest httpRequest) {
        String signatureHeader = resolveSignatureHeader(httpRequest);
        String gatewayEventId  = resolveEventId(httpRequest);

        byte[] rawPayload;
        try {
            rawPayload = httpRequest.getInputStream().readAllBytes();
        } catch (IOException e) {
            log.error("[Webhook] Failed to read request body: {}", e.getMessage());
            return ResponseEntity.ok(WebhookPaymentResponse.error(gatewayEventId, "Failed to read payload"));
        }

        log.info("[Webhook] Received: eventId={} payloadBytes={} signature={}",
                gatewayEventId, rawPayload.length, signatureHeader != null ? signatureHeader.substring(0, Math.min(12, signatureHeader.length())) + "..." : "null");

        WebhookProcessingResult result = webhookVerificationService.processWebhookEvent(
                rawPayload, signatureHeader, gatewayEventId);

        return switch (result.status()) {
            case PROCESSED        -> ResponseEntity.ok(WebhookPaymentResponse.received(gatewayEventId));
            case ALREADY_PROCESSED -> ResponseEntity.ok(WebhookPaymentResponse.duplicate(gatewayEventId));
            case SIGNATURE_INVALID -> {
                log.warn("[Webhook] Rejected — invalid signature: eventId={}", gatewayEventId);
                yield ResponseEntity.ok(WebhookPaymentResponse.error(gatewayEventId, "Signature verification failed"));
            }
            case FAILED -> {
                log.error("[Webhook] Processing failed: eventId={} reason={}", gatewayEventId, result.errorMessage());
                yield ResponseEntity.ok(WebhookPaymentResponse.error(gatewayEventId, result.errorMessage()));
            }
        };
    }

    private String resolveSignatureHeader(HttpServletRequest request) {
        String razorpay = request.getHeader("X-Razorpay-Signature");
        if (razorpay != null) return razorpay;
        return request.getHeader("X-Payment-Signature");
    }

    private String resolveEventId(HttpServletRequest request) {
        String razorpay = request.getHeader("X-Razorpay-Event-Id");
        if (razorpay != null) return razorpay;
        String fallback = request.getHeader("X-Webhook-Event-Id");
        return fallback != null ? fallback : "evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
