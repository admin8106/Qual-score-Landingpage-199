package com.qualscore.qualcore.integration.config;

import com.qualscore.qualcore.integration.config.ProviderConfigRow.AiConfigRow;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.CrmConfigRow;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.EmailConfigRow;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.PaymentConfigRow;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.WhatsAppConfigRow;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderConfigCache {

    private final JdbcTemplate jdbcTemplate;

    @Value("${integrations.environment-mode:SANDBOX}")
    private String environmentMode;

    private final AtomicReference<CacheSnapshot> snapshot = new AtomicReference<>(CacheSnapshot.empty());

    @PostConstruct
    public void loadOnStartup() {
        refresh();
    }

    @Scheduled(fixedDelayString = "${integrations.cache.refresh-interval-ms:60000}")
    public void refresh() {
        try {
            CacheSnapshot fresh = new CacheSnapshot(
                loadAiConfig(),
                loadPaymentConfig(),
                loadWhatsAppConfig(),
                loadEmailConfig(),
                loadCrmConfig()
            );
            snapshot.set(fresh);
            log.info("[ProviderConfigCache] Refreshed | env={} ai={} payment={} wa={} email={} crm={}",
                environmentMode,
                fresh.aiConfig().map(AiConfigRow::providerCode).orElse("none"),
                fresh.paymentConfig().map(PaymentConfigRow::providerCode).orElse("none"),
                fresh.whatsAppConfig().map(WhatsAppConfigRow::providerCode).orElse("none"),
                fresh.emailConfig().map(EmailConfigRow::providerCode).orElse("none"),
                fresh.crmConfig().map(CrmConfigRow::providerCode).orElse("none"));
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] Refresh failed — retaining stale cache: {}", ex.getMessage(), ex);
        }
    }

    public Optional<AiConfigRow> getActiveAiConfig()           { return snapshot.get().aiConfig(); }
    public Optional<PaymentConfigRow> getActivePaymentConfig() { return snapshot.get().paymentConfig(); }
    public Optional<WhatsAppConfigRow> getActiveWhatsAppConfig() { return snapshot.get().whatsAppConfig(); }
    public Optional<EmailConfigRow> getActiveEmailConfig()     { return snapshot.get().emailConfig(); }
    public Optional<CrmConfigRow> getActiveCrmConfig()         { return snapshot.get().crmConfig(); }
    public String getEnvironmentMode()                         { return environmentMode; }

    record CacheSnapshot(
        Optional<AiConfigRow> aiConfig,
        Optional<PaymentConfigRow> paymentConfig,
        Optional<WhatsAppConfigRow> whatsAppConfig,
        Optional<EmailConfigRow> emailConfig,
        Optional<CrmConfigRow> crmConfig
    ) {
        static CacheSnapshot empty() {
            return new CacheSnapshot(
                Optional.empty(), Optional.empty(),
                Optional.empty(), Optional.empty(), Optional.empty()
            );
        }
    }

    private Optional<AiConfigRow> loadAiConfig() {
        Optional<AiConfigRow> primary = queryAiConfig(true, false);
        if (primary.isPresent()) return primary;
        Optional<AiConfigRow> fallback = queryAiConfig(false, true);
        if (fallback.isPresent()) {
            log.warn("[ProviderConfigCache] AI: using fallback provider");
            return fallback;
        }
        return Optional.empty();
    }

    private Optional<AiConfigRow> queryAiConfig(boolean isPrimary, boolean isFallback) {
        String sql = """
            SELECT id, provider_code, provider_name, api_key_encrypted, model_name,
                   base_url, temperature, max_tokens, timeout_seconds, retry_count,
                   json_strict_mode, is_primary, is_fallback, environment_mode
            FROM ai_provider_configs
            WHERE is_active = true
              AND environment_mode = ?
              AND is_primary = ?
              AND is_fallback = ?
            ORDER BY display_order ASC
            LIMIT 1
            """;
        try {
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    return Optional.of(new AiConfigRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("provider_code"),
                        rs.getString("provider_name"),
                        rs.getString("api_key_encrypted"),
                        rs.getString("model_name"),
                        rs.getString("base_url"),
                        rs.getDouble("temperature"),
                        rs.getInt("max_tokens"),
                        rs.getInt("timeout_seconds"),
                        rs.getInt("retry_count"),
                        rs.getBoolean("json_strict_mode"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_fallback"),
                        rs.getString("environment_mode")
                    ));
                }
                return Optional.empty();
            }, environmentMode, isPrimary, isFallback);
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] AI config query failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<PaymentConfigRow> loadPaymentConfig() {
        Optional<PaymentConfigRow> primary = queryPaymentConfig(true, false);
        if (primary.isPresent()) return primary;
        Optional<PaymentConfigRow> fallback = queryPaymentConfig(false, true);
        if (fallback.isPresent()) {
            log.warn("[ProviderConfigCache] Payment: using fallback provider");
            return fallback;
        }
        return Optional.empty();
    }

    private Optional<PaymentConfigRow> queryPaymentConfig(boolean isPrimary, boolean isFallback) {
        String sql = """
            SELECT id, provider_code, provider_name, environment_mode,
                   is_primary, is_fallback,
                   razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
                   payu_merchant_key, payu_salt, payu_base_url
            FROM payment_provider_configs
            WHERE is_active = true
              AND environment_mode = ?
              AND is_primary = ?
              AND is_fallback = ?
            ORDER BY display_order ASC
            LIMIT 1
            """;
        try {
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    return Optional.of(new PaymentConfigRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("provider_code"),
                        rs.getString("provider_name"),
                        rs.getString("environment_mode"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_fallback"),
                        rs.getString("razorpay_key_id"),
                        rs.getString("razorpay_key_secret"),
                        rs.getString("razorpay_webhook_secret"),
                        rs.getString("payu_merchant_key"),
                        rs.getString("payu_salt"),
                        rs.getString("payu_base_url")
                    ));
                }
                return Optional.empty();
            }, environmentMode, isPrimary, isFallback);
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] Payment config query failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<WhatsAppConfigRow> loadWhatsAppConfig() {
        Optional<WhatsAppConfigRow> primary = queryWhatsAppConfig(true, false);
        if (primary.isPresent()) return primary;
        Optional<WhatsAppConfigRow> fallback = queryWhatsAppConfig(false, true);
        if (fallback.isPresent()) {
            log.warn("[ProviderConfigCache] WhatsApp: using fallback provider");
            return fallback;
        }
        return Optional.empty();
    }

    private Optional<WhatsAppConfigRow> queryWhatsAppConfig(boolean isPrimary, boolean isFallback) {
        String sql = """
            SELECT id, provider_code, provider_name, environment_mode,
                   is_primary, is_fallback,
                   meta_access_token, meta_phone_number_id, meta_business_account_id,
                   meta_api_version, meta_webhook_verify_token
            FROM whatsapp_provider_configs
            WHERE is_active = true
              AND environment_mode = ?
              AND is_primary = ?
              AND is_fallback = ?
            ORDER BY display_order ASC
            LIMIT 1
            """;
        try {
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    return Optional.of(new WhatsAppConfigRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("provider_code"),
                        rs.getString("provider_name"),
                        rs.getString("environment_mode"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_fallback"),
                        rs.getString("meta_access_token"),
                        rs.getString("meta_phone_number_id"),
                        rs.getString("meta_business_account_id"),
                        rs.getString("meta_api_version"),
                        rs.getString("meta_webhook_verify_token")
                    ));
                }
                return Optional.empty();
            }, environmentMode, isPrimary, isFallback);
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] WhatsApp config query failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<EmailConfigRow> loadEmailConfig() {
        Optional<EmailConfigRow> primary = queryEmailConfig(true, false);
        if (primary.isPresent()) return primary;
        Optional<EmailConfigRow> fallback = queryEmailConfig(false, true);
        if (fallback.isPresent()) {
            log.warn("[ProviderConfigCache] Email: using fallback provider");
            return fallback;
        }
        return Optional.empty();
    }

    private Optional<EmailConfigRow> queryEmailConfig(boolean isPrimary, boolean isFallback) {
        String sql = """
            SELECT id, provider_code, provider_name, environment_mode,
                   is_primary, is_fallback, sender_email, sender_name, reply_to_email,
                   resend_api_key, sendgrid_api_key, smtp_host, smtp_port,
                   smtp_username, smtp_password, smtp_use_tls
            FROM email_provider_configs
            WHERE is_active = true
              AND environment_mode = ?
              AND is_primary = ?
              AND is_fallback = ?
            ORDER BY display_order ASC
            LIMIT 1
            """;
        try {
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    return Optional.of(new EmailConfigRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("provider_code"),
                        rs.getString("provider_name"),
                        rs.getString("environment_mode"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_fallback"),
                        rs.getString("sender_email"),
                        rs.getString("sender_name"),
                        rs.getString("reply_to_email"),
                        rs.getString("resend_api_key"),
                        rs.getString("sendgrid_api_key"),
                        rs.getString("smtp_host"),
                        rs.getObject("smtp_port", Integer.class),
                        rs.getString("smtp_username"),
                        rs.getString("smtp_password"),
                        rs.getBoolean("smtp_use_tls")
                    ));
                }
                return Optional.empty();
            }, environmentMode, isPrimary, isFallback);
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] Email config query failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<CrmConfigRow> loadCrmConfig() {
        Optional<CrmConfigRow> primary = queryCrmConfig(true, false);
        if (primary.isPresent()) return primary;
        Optional<CrmConfigRow> fallback = queryCrmConfig(false, true);
        if (fallback.isPresent()) {
            log.warn("[ProviderConfigCache] CRM: using fallback provider");
            return fallback;
        }
        return Optional.empty();
    }

    private Optional<CrmConfigRow> queryCrmConfig(boolean isPrimary, boolean isFallback) {
        String sql = """
            SELECT id, provider_code, provider_name, environment_mode,
                   is_primary, is_fallback, base_url, auth_token,
                   mapping_mode, sync_contact, sync_deal, custom_field_mappings
            FROM crm_provider_configs
            WHERE is_active = true
              AND environment_mode = ?
              AND is_primary = ?
              AND is_fallback = ?
            ORDER BY display_order ASC
            LIMIT 1
            """;
        try {
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    return Optional.of(new CrmConfigRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("provider_code"),
                        rs.getString("provider_name"),
                        rs.getString("environment_mode"),
                        rs.getBoolean("is_primary"),
                        rs.getBoolean("is_fallback"),
                        rs.getString("base_url"),
                        rs.getString("auth_token"),
                        rs.getString("mapping_mode"),
                        rs.getBoolean("sync_contact"),
                        rs.getBoolean("sync_deal"),
                        rs.getString("custom_field_mappings")
                    ));
                }
                return Optional.empty();
            }, environmentMode, isPrimary, isFallback);
        } catch (Exception ex) {
            log.error("[ProviderConfigCache] CRM config query failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
