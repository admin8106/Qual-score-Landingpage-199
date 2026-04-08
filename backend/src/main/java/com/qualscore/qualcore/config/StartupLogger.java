package com.qualscore.qualcore.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Prints a structured startup summary and validates that production-required
 * environment variables are present.
 *
 * Validation rules (prod profile only):
 *   - JWT_SECRET must not be the insecure default placeholder.
 *   - DATABASE_URL or DB_URL must be set (empty datasource URL is fatal at runtime anyway).
 *   - FRONTEND_URL should be set; missing it means notification links will point to localhost.
 *   - When a real payment provider is active, the corresponding keys must be non-blank.
 *   - When OpenAI is enabled, OPENAI_API_KEY must be present.
 *   - When WhatsApp/Email/CRM providers are non-stub, their keys must be present.
 *
 * All warnings are logged at WARN level so they surface in Render log streams.
 * No exception is thrown — the application still starts; ops must review the logs.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StartupLogger {

    private static final String INSECURE_JWT_DEFAULT = "change-this-in-production-use-a-long-random-string";

    private final Environment environment;
    private final JdbcTemplate jdbcTemplate;

    @Value("${server.port:8080}")
    private String port;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.environment:local}")
    private String appEnvironment;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${integrations.payment.provider:mock}")
    private String paymentProvider;

    @Value("${integrations.openai.enabled:false}")
    private boolean openAiEnabled;

    @Value("${integrations.openai.api-key:}")
    private String openAiApiKey;

    @Value("${integrations.openai.model:gpt-4o}")
    private String openAiModel;

    @Value("${integrations.whatsapp.provider:stub}")
    private String whatsAppProvider;

    @Value("${integrations.whatsapp.access-token:}")
    private String whatsAppToken;

    @Value("${integrations.email.provider:stub}")
    private String emailProvider;

    @Value("${integrations.email.resend-api-key:}")
    private String resendApiKey;

    @Value("${integrations.crm.provider:stub}")
    private String crmProvider;

    @Value("${integrations.crm.webhook-url:}")
    private String crmWebhookUrl;

    @Value("${integrations.razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${integrations.razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Value("${integrations.payu.merchant-key:}")
    private String payuMerchantKey;

    @Value("${integrations.payu.merchant-salt:}")
    private String payuMerchantSalt;

    @Value("${security.jwt.secret:}")
    private String jwtSecret;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        String[] activeProfiles = environment.getActiveProfiles();
        String profiles = activeProfiles.length > 0 ? Arrays.toString(activeProfiles) : "[default]";
        boolean isProd = Arrays.asList(activeProfiles).contains("prod");

        log.info("=======================================================");
        log.info("  QualCore Backend started successfully");
        log.info("  Version     : {}", appVersion);
        log.info("  Environment : {}", appEnvironment);
        log.info("  Profile(s)  : {}", profiles);
        log.info("  Port        : {}", port);
        log.info("  Frontend URL: {}", baseUrl);
        log.info("-------------------------------------------------------");

        String dbStatus = checkDatabase();
        log.info("  Database    : {}", dbStatus);

        log.info("  Providers   :");
        log.info("    Payment   : {}", paymentProvider);
        log.info("    AI/OpenAI : {} (model={})", openAiEnabled ? "enabled" : "disabled (rule-based fallback)", openAiModel);
        log.info("    WhatsApp  : {}", whatsAppProvider);
        log.info("    Email     : {}", emailProvider);
        log.info("    CRM       : {}", crmProvider);
        log.info("=======================================================");

        if (isProd) {
            List<String> warnings = validateProductionSecrets();
            if (!warnings.isEmpty()) {
                log.warn("=======================================================");
                log.warn("  [CONFIG] {} production configuration warning(s):", warnings.size());
                for (String w : warnings) {
                    log.warn("  [CONFIG]   - {}", w);
                }
                log.warn("=======================================================");
            }
        }
    }

    private String checkDatabase() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return "connected";
        } catch (Exception e) {
            log.error("[Startup] Database connection check failed: {}", e.getMessage());
            return "FAILED - " + e.getMessage();
        }
    }

    /**
     * Validates required secrets and configration for the prod profile.
     * Returns a list of human-readable warning messages; empty list = all clear.
     *
     * Environment variables checked:
     *   JWT_SECRET           — must not be the insecure default
     *   FRONTEND_URL         — should be set to the production app domain
     *   RAZORPAY_KEY_ID/SECRET — required when INTEGRATIONS_PAYMENT_PROVIDER=razorpay
     *   PAYU_MERCHANT_KEY/SALT — required when INTEGRATIONS_PAYMENT_PROVIDER=payu
     *   OPENAI_API_KEY       — required when OPENAI_ENABLED=true
     *   WHATSAPP_ACCESS_TOKEN — required when WHATSAPP_PROVIDER=meta
     *   RESEND_API_KEY       — required when EMAIL_PROVIDER=resend
     *   CRM_WEBHOOK_URL      — required when CRM_PROVIDER=webhook
     */
    private List<String> validateProductionSecrets() {
        List<String> warnings = new ArrayList<>();

        if (INSECURE_JWT_DEFAULT.equals(jwtSecret) || jwtSecret.isBlank()) {
            warnings.add("JWT_SECRET is not set or uses the insecure default. "
                    + "Generate a secure value: openssl rand -base64 64");
        }

        if (baseUrl.startsWith("http://localhost")) {
            warnings.add("FRONTEND_URL is not set — notification links will point to localhost. "
                    + "Set FRONTEND_URL to your production domain (e.g. https://app.qualscore.in).");
        }

        if ("razorpay".equalsIgnoreCase(paymentProvider)) {
            if (razorpayKeyId.isBlank()) {
                warnings.add("RAZORPAY_KEY_ID is not set but INTEGRATIONS_PAYMENT_PROVIDER=razorpay.");
            }
            if (razorpayKeySecret.isBlank()) {
                warnings.add("RAZORPAY_KEY_SECRET is not set but INTEGRATIONS_PAYMENT_PROVIDER=razorpay.");
            }
        }

        if ("payu".equalsIgnoreCase(paymentProvider)) {
            if (payuMerchantKey.isBlank()) {
                warnings.add("PAYU_MERCHANT_KEY is not set but INTEGRATIONS_PAYMENT_PROVIDER=payu.");
            }
            if (payuMerchantSalt.isBlank()) {
                warnings.add("PAYU_MERCHANT_SALT is not set but INTEGRATIONS_PAYMENT_PROVIDER=payu.");
            }
        }

        if (openAiEnabled && openAiApiKey.isBlank()) {
            warnings.add("OPENAI_API_KEY is not set but OPENAI_ENABLED=true. "
                    + "AI report generation will fall back to rule-based output.");
        }

        if ("meta".equalsIgnoreCase(whatsAppProvider) && whatsAppToken.isBlank()) {
            warnings.add("WHATSAPP_ACCESS_TOKEN is not set but WHATSAPP_PROVIDER=meta. "
                    + "WhatsApp notifications will fail.");
        }

        if ("resend".equalsIgnoreCase(emailProvider) && resendApiKey.isBlank()) {
            warnings.add("RESEND_API_KEY is not set but EMAIL_PROVIDER=resend. "
                    + "Email notifications will fail.");
        }

        if ("webhook".equalsIgnoreCase(crmProvider) && crmWebhookUrl.isBlank()) {
            warnings.add("CRM_WEBHOOK_URL is not set but CRM_PROVIDER=webhook. "
                    + "CRM pushes will fail.");
        }

        return warnings;
    }
}
