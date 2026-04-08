package com.qualscore.qualcore.payment;

/**
 * Gateway-agnostic signature verification request for the client-side callback.
 *
 * Razorpay:
 *   signaturePayload = gatewayOrderId + "|" + gatewayPaymentId
 *   signature        = X-Razorpay-Signature value submitted by the frontend
 *
 * PayU:
 *   signaturePayload = pipe-separated hash string (key|txnid|amount|...)
 *   signature        = hash value returned by PayU in the response
 */
public record SignatureVerificationRequest(
        String gatewayOrderId,
        String gatewayPaymentId,
        String gatewaySignature,
        String signaturePayload
) {}
