package com.qualscore.qualcore.crm;

import com.qualscore.qualcore.notification.CrmPayload;

/**
 * Provider-agnostic CRM push request.
 *
 * Wraps the canonical {@link CrmPayload} together with routing metadata
 * so that provider implementations can extract what they need without
 * reaching back into the service layer.
 *
 * {@code idempotencyKey}  Caller-supplied deduplication key (persisted in communication_events)
 * {@code payload}         Fully-built canonical CRM payload
 */
public record CrmPushRequest(
        String idempotencyKey,
        CrmPayload payload
) {
    public static CrmPushRequest of(String idempotencyKey, CrmPayload payload) {
        return new CrmPushRequest(idempotencyKey, payload);
    }
}
