package com.qualscore.qualcore.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Structured audit log implementation.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * OUTPUT FORMAT (JSON-structured log line at INFO level):
 *
 *   [AUDIT] eventType=PAYMENT_VERIFIED outcome=SUCCESS
 *           actor=PAY-xxxx resource=PaymentTransaction/PAY-xxxx
 *           requestId=abc-123 ip=1.2.3.4
 *           meta={"gateway":"RAZORPAY","amountPaise":49900}
 *
 * All audit lines are prefixed with [AUDIT] to allow grep/filter in log
 * aggregators (Grafana Loki, Datadog, CloudWatch Insights, etc.).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EXTENSION POINT — DB persistence:
 *   Inject AuditLogRepository (or JdbcTemplate) and write to audit_log table
 *   in a SEPARATE transaction (REQUIRES_NEW) so audit never rolls back
 *   with the main transaction.
 *
 *   Example schema (see Supabase migration):
 *     id, event_type, actor_id, resource_type, resource_id,
 *     outcome, request_id, remote_ip, metadata (jsonb), occurred_at
 *
 * EXTENSION POINT — async streaming:
 *   Publish AuditEvent to a Spring ApplicationEvent and consume asynchronously
 *   (e.g. @EventListener + @Async) to avoid blocking the main thread.
 *   The current synchronous implementation is fine for <1000 req/s.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SANITIZATION CONTRACT:
 *   This implementation does NOT sanitize metadata. Callers are responsible
 *   for ensuring no secrets are included (see AuditEvent Javadoc for rules).
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final ObjectMapper objectMapper;

    @Override
    public void record(AuditEvent event) {
        try {
            String metaJson = toJson(event.metadata());
            log.info("[AUDIT] eventType={} outcome={} actor={} resource={}/{} requestId={} ip={} meta={}",
                    event.eventType(),
                    event.outcome(),
                    event.actorId(),
                    event.resourceType(),
                    event.resourceId(),
                    event.requestId() != null ? event.requestId() : MDC.get("requestId"),
                    event.remoteIp()  != null ? event.remoteIp()  : MDC.get("remoteIp"),
                    metaJson);

            // ── EXTENSION POINT: persist to DB ───────────────────────────────
            // auditLogRepository.save(toEntity(event));
            //
            // ── EXTENSION POINT: stream to observability platform ────────────
            // applicationEventPublisher.publishEvent(new AuditDomainEvent(event));

        } catch (Exception e) {
            log.warn("[AUDIT] Failed to write audit log entry for eventType={}: {}",
                    event.eventType(), e.getMessage());
        }
    }

    @Override
    public void success(AuditEventType eventType,
                        String actorId,
                        String resourceType,
                        String resourceId,
                        Map<String, Object> metadata) {
        record(AuditEvent.builder()
                .eventType(eventType)
                .actorId(actorId)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .outcome("SUCCESS")
                .requestId(MDC.get("requestId"))
                .remoteIp(MDC.get("remoteIp"))
                .metadata(metadata != null ? metadata : Map.of())
                .occurredAt(OffsetDateTime.now())
                .build());
    }

    @Override
    public void failure(AuditEventType eventType,
                        String actorId,
                        String resourceType,
                        String resourceId,
                        Map<String, Object> metadata) {
        record(AuditEvent.builder()
                .eventType(eventType)
                .actorId(actorId)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .outcome("FAILURE")
                .requestId(MDC.get("requestId"))
                .remoteIp(MDC.get("remoteIp"))
                .metadata(metadata != null ? metadata : Map.of())
                .occurredAt(OffsetDateTime.now())
                .build());
    }

    @Override
    public void skipped(AuditEventType eventType,
                        String actorId,
                        String resourceType,
                        String resourceId,
                        Map<String, Object> metadata) {
        record(AuditEvent.builder()
                .eventType(eventType)
                .actorId(actorId)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .outcome("SKIPPED")
                .requestId(MDC.get("requestId"))
                .remoteIp(MDC.get("remoteIp"))
                .metadata(metadata != null ? metadata : Map.of())
                .occurredAt(OffsetDateTime.now())
                .build());
    }

    private String toJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) return "{}";
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException e) {
            return "{\"_serializationError\":true}";
        }
    }
}
