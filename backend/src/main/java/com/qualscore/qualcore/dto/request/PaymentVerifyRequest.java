package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /api/v1/payments/verify.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RAZORPAY
 * ─────────────────────────────────────────────────────────────────────────
 *   gatewayOrderId   = razorpay_order_id   (from JS checkout callback)
 *   gatewayPaymentId = razorpay_payment_id  (from JS checkout callback)
 *   gatewaySignature = razorpay_signature   (from JS checkout callback)
 *   signaturePayload = NOT required — backend reconstructs "orderId|paymentId"
 *   paymentReference = internal ref from /initiate (for idempotency + audit)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PAYU
 * ─────────────────────────────────────────────────────────────────────────
 *   gatewayOrderId   = txnid       (from PayU redirect query params)
 *   gatewayPaymentId = mihpayid    (from PayU redirect query params)
 *   gatewaySignature = hash        (from PayU redirect query params)
 *   signaturePayload = REQUIRED — pre-built pipe string from redirect params:
 *     "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
 *   paymentReference = internal ref from /initiate
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MOCK
 * ─────────────────────────────────────────────────────────────────────────
 *   Any non-blank values accepted — backend skips all hash/HMAC verification.
 */
@Data
public class PaymentVerifyRequest {

    @NotBlank(message = "Gateway order ID is required")
    private String gatewayOrderId;

    @NotBlank(message = "Gateway payment ID is required")
    private String gatewayPaymentId;

    @NotBlank(message = "Gateway signature is required")
    private String gatewaySignature;

    /**
     * PayU only: the pre-built reverse hash payload string.
     * Constructed by the frontend from PayU redirect params:
     *   "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
     * Not required for Razorpay or Mock — leave null/omit.
     */
    private String signaturePayload;

    /**
     * Internal payment reference from /initiate response.
     * Optional — used for additional audit trail linkage.
     */
    private String paymentReference;
}
