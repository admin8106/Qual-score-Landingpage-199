package com.qualscore.qualcore.audit;

import java.util.Map;

/**
 * Service for recording structured audit events across the QualScore platform.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Usage pattern (prefer the convenience methods):
 *
 *   auditLogService.record(AuditEventType.PAYMENT_VERIFIED,
 *       "PAY-xxxx", "PaymentTransaction", "PAY-xxxx",
 *       Map.of("gateway", "RAZORPAY", "amountPaise", 49900));
 *
 *   auditLogService.failure(AuditEventType.DIAGNOSTIC_ANALYSIS_FAILED,
 *       candidateCode, "DiagnosticAnalysis", candidateCode,
 *       Map.of("reason", ex.getMessage()));
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Implementation contract:
 *   - record() MUST NOT throw. Audit failures must never break the main flow.
 *   - The implementation logs synchronously to SLF4J at INFO level.
 *   - Future: persist to audit_log table (DB) or stream to observability platform.
 *   - The requestId and remoteIp are automatically pulled from MDC.
 * ─────────────────────────────────────────────────────────────────────────
 */
public interface AuditLogService {

    void record(AuditEvent event);

    void success(AuditEventType eventType,
                 String actorId,
                 String resourceType,
                 String resourceId,
                 Map<String, Object> metadata);

    void failure(AuditEventType eventType,
                 String actorId,
                 String resourceType,
                 String resourceId,
                 Map<String, Object> metadata);

    void skipped(AuditEventType eventType,
                 String actorId,
                 String resourceType,
                 String resourceId,
                 Map<String, Object> metadata);
}
