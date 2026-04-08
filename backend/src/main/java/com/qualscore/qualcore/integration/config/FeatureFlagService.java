package com.qualscore.qualcore.integration.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final JdbcTemplate jdbcTemplate;

    private final Map<String, Boolean> flagCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadOnStartup() {
        refresh();
    }

    @Scheduled(fixedDelayString = "${integrations.cache.refresh-interval-ms:60000}")
    public void refresh() {
        try {
            Map<String, Boolean> fresh = new ConcurrentHashMap<>();
            jdbcTemplate.query(
                "SELECT flag_key, is_enabled FROM integration_feature_flags",
                rs -> {
                    fresh.put(rs.getString("flag_key"), rs.getBoolean("is_enabled"));
                }
            );
            flagCache.clear();
            flagCache.putAll(fresh);
            log.debug("[FeatureFlags] Refreshed {} flags", fresh.size());
        } catch (Exception ex) {
            log.warn("[FeatureFlags] Failed to refresh feature flags — retaining previous cache: {}", ex.getMessage());
        }
    }

    public boolean isEnabled(String flagKey) {
        return flagCache.getOrDefault(flagKey, true);
    }

    public boolean isEnabled(String flagKey, boolean defaultValue) {
        return flagCache.getOrDefault(flagKey, defaultValue);
    }
}
