package com.qualscore.qualcore.audit;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Immutable audit event record.
 *
 * Fields:
 *   eventType         — canonical operation type (see AuditEventType)
 *   actorId           — who triggered the event: candidateCode, "ADMIN:{subject}", "SYSTEM", "GATEWAY"
 *   resourceType      — entity type (e.g. "PaymentTransaction", "CandidateProfile")
 *   resourceId        — entity identifier (e.g. paymentReference, candidateCode)
 *   outcome           — "SUCCESS" | "FAILURE" | "SKIPPED"
 *   requestId         — correlation ID from MDC (X-Request-Id)
 *   remoteIp          — caller IP from MDC
 *   metadata          — arbitrary key/value bag for event-specific context
 *   occurredAt        — event timestamp
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Security rules for metadata:
 *   NEVER include: raw passwords, JWT tokens, full credit card numbers,
 *   gateway secrets, HMAC signatures, or full raw webhook payloads.
 *   Include: IDs, statuses, score values, counts, boolean flags only.
 * ─────────────────────────────────────────────────────────────────────────
 */
public record AuditEvent(
        AuditEventType eventType,
        String actorId,
        String resourceType,
        String resourceId,
        String outcome,
        String requestId,
        String remoteIp,
        Map<String, Object> metadata,
        OffsetDateTime occurredAt
) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private AuditEventType eventType;
        private String actorId   = "SYSTEM";
        private String resourceType;
        private String resourceId;
        private String outcome   = "SUCCESS";
        private String requestId;
        private String remoteIp;
        private Map<String, Object> metadata = Map.of();
        private OffsetDateTime occurredAt;

        public Builder eventType(AuditEventType eventType) { this.eventType = eventType; return this; }
        public Builder actorId(String actorId)             { this.actorId = actorId;     return this; }
        public Builder resourceType(String resourceType)   { this.resourceType = resourceType; return this; }
        public Builder resourceId(String resourceId)       { this.resourceId = resourceId; return this; }
        public Builder outcome(String outcome)             { this.outcome = outcome;     return this; }
        public Builder requestId(String requestId)         { this.requestId = requestId; return this; }
        public Builder remoteIp(String remoteIp)           { this.remoteIp = remoteIp;   return this; }
        public Builder metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
        public Builder occurredAt(OffsetDateTime t)        { this.occurredAt = t;        return this; }

        public AuditEvent build() {
            return new AuditEvent(
                    eventType, actorId, resourceType, resourceId,
                    outcome, requestId, remoteIp, metadata,
                    occurredAt != null ? occurredAt : OffsetDateTime.now()
            );
        }
    }
}
