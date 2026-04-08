package com.qualscore.qualcore.payment;

/**
 * Outcome of a single webhook processing attempt.
 *
 * processed       — event was new and handled successfully
 * alreadyProcessed — event was a duplicate; no side effects occurred
 * signatureInvalid — webhook failed cryptographic verification; payload rejected
 * failed          — signature valid but downstream processing failed (see errorMessage)
 */
public record WebhookProcessingResult(
        Status status,
        String gatewayEventId,
        String gatewayOrderId,
        String errorMessage
) {
    public enum Status {
        PROCESSED,
        ALREADY_PROCESSED,
        SIGNATURE_INVALID,
        FAILED
    }

    public static WebhookProcessingResult processed(String eventId, String orderId) {
        return new WebhookProcessingResult(Status.PROCESSED, eventId, orderId, null);
    }

    public static WebhookProcessingResult alreadyProcessed(String eventId) {
        return new WebhookProcessingResult(Status.ALREADY_PROCESSED, eventId, null, null);
    }

    public static WebhookProcessingResult signatureInvalid(String eventId) {
        return new WebhookProcessingResult(Status.SIGNATURE_INVALID, eventId, null, "Webhook signature verification failed");
    }

    public static WebhookProcessingResult failed(String eventId, String reason) {
        return new WebhookProcessingResult(Status.FAILED, eventId, null, reason);
    }

    public boolean isProcessed() {
        return status == Status.PROCESSED;
    }

    public boolean isDuplicate() {
        return status == Status.ALREADY_PROCESSED;
    }
}
