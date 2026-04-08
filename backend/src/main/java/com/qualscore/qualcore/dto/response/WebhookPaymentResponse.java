package com.qualscore.qualcore.dto.response;

/**
 * Response returned to the gateway from the webhook endpoint.
 *
 * Gateways expect a 200 OK response with a simple acknowledgement body.
 * Returning any non-2xx status causes the gateway to retry delivery.
 *
 * status    — "received" | "duplicate" | "error"
 * eventId   — echoes the gatewayEventId for traceability in gateway logs
 * message   — human-readable description (not shown to end users)
 */
public record WebhookPaymentResponse(
        String status,
        String eventId,
        String message
) {
    public static WebhookPaymentResponse received(String eventId) {
        return new WebhookPaymentResponse("received", eventId, "Event processed successfully");
    }

    public static WebhookPaymentResponse duplicate(String eventId) {
        return new WebhookPaymentResponse("duplicate", eventId, "Event already processed");
    }

    public static WebhookPaymentResponse error(String eventId, String reason) {
        return new WebhookPaymentResponse("error", eventId, reason);
    }
}
