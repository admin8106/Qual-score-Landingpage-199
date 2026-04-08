package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.payment.CheckoutType;
import com.qualscore.qualcore.payment.PayUOrderData;
import lombok.Builder;
import lombok.Data;

/**
 * Response for POST /api/v1/payments/initiate.
 *
 * The frontend uses checkoutType to decide which payment UI to render:
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RAZORPAY_MODAL
 * ─────────────────────────────────────────────────────────────────────────
 *   Use: keyId, gatewayOrderId, amountPaise, currency
 *   Flow:
 *     new Razorpay({ key: keyId, order_id: gatewayOrderId,
 *                    amount: amountPaise, currency, ... }).open()
 *   On handler callback: call /verify with { gatewayOrderId, gatewayPaymentId,
 *                                             gatewaySignature, paymentReference }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PAYU_FORM
 * ─────────────────────────────────────────────────────────────────────────
 *   Use: payuData (all checkout form fields pre-computed server-side)
 *   Flow:
 *     Build <form POST to payuData.baseUrl/_payment> with payuData fields as hidden inputs.
 *     On PayU redirect to surl: call /verify with:
 *       { gatewayOrderId: txnid, gatewayPaymentId: mihpayid,
 *         gatewaySignature: hash,
 *         signaturePayload: "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key" }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MOCK
 * ─────────────────────────────────────────────────────────────────────────
 *   No real gateway — simulate payment in dev/test.
 *   Call /verify directly with a synthetic signature.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Data
@Builder
public class PaymentInitiateResponse {

    private String paymentReference;

    private String gatewayOrderId;

    private Integer amountPaise;

    private String currency;

    /**
     * Razorpay Key ID (rzp_live_xxx) or PayU merchant key.
     * For RAZORPAY_MODAL: pass as { key } to Razorpay Checkout.
     * For PAYU_FORM: redundant — same value is inside payuData.key.
     * For MOCK: empty string.
     */
    private String keyId;

    /**
     * "RAZORPAY" | "PAYU" | "MOCK"
     * Identifies the active gateway for display/logging.
     */
    private String provider;

    /**
     * Determines which checkout UI to render:
     *   RAZORPAY_MODAL — open Razorpay JS checkout modal
     *   PAYU_FORM      — build and POST an HTML form to PayU
     *   MOCK           — skip gateway, simulate payment
     */
    private CheckoutType checkoutType;

    /**
     * Populated only when checkoutType=PAYU_FORM.
     * Contains all fields needed to construct the PayU form POST.
     * null for RAZORPAY_MODAL and MOCK.
     */
    private PayUOrderData payuData;

    private String createdAt;
}
