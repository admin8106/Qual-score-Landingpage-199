package com.qualscore.qualcore.payment;

/**
 * Verifies inbound webhook payloads from a payment gateway.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Idempotency contract:
 *   The service checks whether the webhook event has already been processed
 *   using the gateway-supplied event ID. If already seen, it returns
 *   {@link WebhookProcessingResult#alreadyProcessed()} to allow the caller
 *   to short-circuit cleanly (respond 200 to the gateway without side effects).
 *
 * Why this matters:
 *   Payment gateways retry webhook delivery on non-2xx responses and during
 *   transient outages. Processing the same event twice (e.g. double-crediting
 *   a payment status) must never happen.
 * ─────────────────────────────────────────────────────────────────────────
 */
public interface WebhookVerificationService {

    /**
     * Fully processes an inbound webhook event:
     *   1. Verifies the signature using {@link PaymentGatewayClient#verifyWebhookSignature}
     *   2. Parses the event type from the raw payload
     *   3. Checks idempotency against the persisted event ID
     *   4. Delegates to the appropriate handler based on event type
     *   5. Persists the event ID to prevent reprocessing
     *
     * @param rawPayload      raw UTF-8 bytes of the request body (MUST be read before any parsing)
     * @param signatureHeader value of the gateway's signature header
     * @param gatewayEventId  unique event ID from the gateway (used for idempotency)
     * @return result indicating whether the event was newly processed or was a duplicate
     */
    WebhookProcessingResult processWebhookEvent(byte[] rawPayload,
                                                 String signatureHeader,
                                                 String gatewayEventId);
}
