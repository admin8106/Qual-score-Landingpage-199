package com.qualscore.qualcore.payment;

/**
 * Provider-agnostic abstraction over a payment gateway.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Implementations:
 *   MockPaymentGatewayClient      — in-process stub, active when no key is set
 *   RazorpayPaymentGatewayClient  — production Razorpay HTTP client (wired later)
 *   PayUPaymentGatewayClient      — production PayU HTTP client (wired later)
 *
 * Selection strategy:
 *   Implementations are @ConditionalOnProperty-gated.
 *   Set integrations.payment.provider=razorpay (or payu) in application.yml
 *   to activate the real client. Defaults to mock.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONTRACT
 *   All methods are synchronous. Timeout + retry handling is the
 *   responsibility of the implementing client, not the service layer.
 *
 *   Implementations MUST NOT throw checked exceptions.
 *   Use PaymentGatewayException (unchecked) for unrecoverable failures.
 * ─────────────────────────────────────────────────────────────────────────
 */
public interface PaymentGatewayClient {

    /**
     * Returns the canonical name for this gateway (e.g. "RAZORPAY", "PAYU", "MOCK").
     * Stored in PaymentTransaction.gatewayName.
     */
    String gatewayName();

    /**
     * Creates an order/session on the gateway side.
     *
     * @param request all parameters needed to create the order
     * @return gateway-assigned order details including the orderId to be passed to the frontend
     */
    GatewayOrderResult createOrder(CreateOrderRequest request);

    /**
     * Verifies the cryptographic signature returned by the gateway after payment capture.
     *
     * For Razorpay: HMAC-SHA256 of "orderId|paymentId" using the key secret.
     * For PayU:     SHA-512 hash of a pipe-separated canonical string.
     *
     * Returns {@code true} if the signature is valid; {@code false} otherwise.
     * Must never throw — callers treat a {@code false} return as a failed payment.
     */
    boolean verifySignature(SignatureVerificationRequest request);

    /**
     * Verifies the webhook payload signature sent by the gateway server.
     *
     * For Razorpay: X-Razorpay-Signature header contains HMAC-SHA256 of raw body.
     * For PayU:     equivalent header-based verification.
     *
     * @param rawPayload    raw UTF-8 bytes of the HTTP request body
     * @param signatureHeader the value of the gateway's signature header
     * @return true if the webhook originated from the genuine gateway
     */
    boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader);

    /**
     * Returns the public key / key-id to be sent to the frontend SDK.
     * The frontend uses this to initialise the checkout widget.
     *
     * For Razorpay: rzp_live_xxxx or rzp_test_xxxx
     * For PayU:     merchant key
     */
    String publicKey();

    // ── Extension point ───────────────────────────────────────────────────
    // Future: refundPayment(RefundRequest) → RefundResult
    // Future: fetchOrderStatus(String gatewayOrderId) → OrderStatusResult
}
