package com.qualscore.qualcore.email;

/**
 * Result returned by an email provider after an attempted send.
 */
public record EmailSendResult(
        boolean success,
        String providerMessageId,
        String errorCode,
        String errorMessage
) {
    public static EmailSendResult success(String messageId) {
        return new EmailSendResult(true, messageId, null, null);
    }

    public static EmailSendResult failure(String errorCode, String errorMessage) {
        return new EmailSendResult(false, null, errorCode, errorMessage);
    }
}
