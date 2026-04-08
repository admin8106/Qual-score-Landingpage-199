package com.qualscore.qualcore.whatsapp;

/**
 * Result returned by a WhatsApp provider after an attempted send.
 */
public record WhatsAppSendResult(
        boolean success,
        String providerMessageId,
        String errorCode,
        String errorMessage
) {
    public static WhatsAppSendResult success(String messageId) {
        return new WhatsAppSendResult(true, messageId, null, null);
    }

    public static WhatsAppSendResult failure(String errorCode, String errorMessage) {
        return new WhatsAppSendResult(false, null, errorCode, errorMessage);
    }
}
