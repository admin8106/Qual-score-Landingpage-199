package com.qualscore.qualcore.integration.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderResolutionLogger {

    private final JdbcTemplate jdbcTemplate;

    private static final String INSERT_SQL = """
        INSERT INTO provider_resolution_logs
          (id, category, environment_mode, resolved_provider_id, resolved_provider_code,
           resolved_provider_name, was_fallback, resolution_status, trigger_context, caller_ref, created_at)
        VALUES (?, ?, ?, ?::uuid, ?, ?, ?, ?, ?, ?, ?)
        """;

    @Async
    public void logResolution(
            String category,
            String envMode,
            UUID providerId,
            String providerCode,
            String providerName,
            boolean wasFallback,
            String status,
            String triggerContext,
            String callerRef) {
        try {
            jdbcTemplate.update(INSERT_SQL,
                UUID.randomUUID(),
                category,
                envMode,
                providerId != null ? providerId.toString() : null,
                providerCode,
                providerName,
                wasFallback,
                status,
                triggerContext,
                callerRef,
                OffsetDateTime.now());
        } catch (Exception ex) {
            log.warn("[ResolutionLogger] Failed to write log: category={} code={} error={}",
                category, providerCode, ex.getMessage());
        }
    }
}
