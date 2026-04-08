package com.qualscore.qualcore.dto.request;

/**
 * Carries the raw webhook body and gateway-specific headers into the service layer.
 *
 * rawPayload      — raw UTF-8 bytes of the request body (do NOT parse before verification)
 * signatureHeader — value of the gateway's signature header
 *                    Razorpay: X-Razorpay-Signature
 *                    PayU:     not header-based; verify via re-hash of POST params
 * gatewayEventId  — unique event ID for idempotency
 *                    Razorpay: X-Razorpay-Event-Id header
 *                    PayU:     mihpayid field in POST body
 *
 * Note: rawPayload must be captured BEFORE any InputStream consumption.
 * The controller must read the bytes from HttpServletRequest before delegation.
 */
public record WebhookPaymentRequest(
        byte[] rawPayload,
        String signatureHeader,
        String gatewayEventId
) {}
