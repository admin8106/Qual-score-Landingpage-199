package com.qualscore.qualcore.crm;

/**
 * Result returned by a CRM provider after an attempted push.
 *
 * {@code success}             Whether the provider accepted the record
 * {@code providerRecordId}    CRM-side ID of the created/updated record (may be null for webhooks)
 * {@code errorCode}           Short machine-readable error token (null on success)
 * {@code errorMessage}        Human-readable error description (null on success)
 */
public record CrmPushResult(
        boolean success,
        String providerRecordId,
        String errorCode,
        String errorMessage
) {
    public static CrmPushResult success(String providerRecordId) {
        return new CrmPushResult(true, providerRecordId, null, null);
    }

    public static CrmPushResult failure(String errorCode, String errorMessage) {
        return new CrmPushResult(false, null, errorCode, errorMessage);
    }
}
