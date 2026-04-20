package com.qualscore.qualcore.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.integration.config.FeatureFlagService;
import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.EmailConfigRow;
import com.qualscore.qualcore.integration.config.ProviderResolutionLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Optional;

/**
 * Dynamic email provider dispatcher.
 *
 * Resolves the active provider from ProviderConfigCache at each call.
 * Builds a fresh concrete provider instance using DB credentials so
 * changes made in the admin dashboard take effect on next cache refresh
 * without any server restart.
 *
 * Fallback order:
 *   1. DB primary provider with DB credentials
 *   2. DB fallback provider with DB credentials
 *   3. Env-var configured EmailProperties (ResendEmailProvider if key present)
 *   4. StubEmailProvider (if feature flag OFF or no config at all)
 *
 * Feature flag: email_send_enabled — when OFF, all sends use the stub.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class DynamicEmailProvider implements EmailProvider {

    private final ProviderConfigCache configCache;
    private final ProviderResolutionLogger resolutionLogger;
    private final FeatureFlagService featureFlagService;
    private final EmailProperties envProps;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "dynamic-email";
    }

    @Override
    public EmailSendResult send(EmailSendRequest request) {
        if (!featureFlagService.isEnabled("email_send_enabled")) {
            log.info("[DynamicEmail] Feature flag 'email_send_enabled' is OFF — using stub");
            resolutionLogger.logResolution("email", configCache.getEnvironmentMode(),
                null, "stub", "StubEmailProvider", false, "FLAG_DISABLED", "SEND", request.to());
            return new StubEmailProvider().send(request);
        }

        Optional<EmailConfigRow> configOpt = configCache.getActiveEmailConfig();

        if (configOpt.isPresent()) {
            EmailConfigRow config = configOpt.get();
            boolean hasDbCreds = hasCredentials(config);

            if (hasDbCreds) {
                boolean wasFallback = config.isFallback();
                log.info("[DynamicEmail] Using DB config: provider={} env={} fallback={}",
                    config.providerCode(), config.environmentMode(), wasFallback);

                resolutionLogger.logResolution("email", config.environmentMode(),
                    config.id(), config.providerCode(), config.providerName(),
                    wasFallback, wasFallback ? "FALLBACK_USED" : "RESOLVED", "SEND", request.to());

                return buildDelegate(config).send(request);
            }
            log.debug("[DynamicEmail] DB config found but no credentials — falling through to env-var");
        }

        if (envProps.isResendConfigured()) {
            log.debug("[DynamicEmail] No DB config — using env-var EmailProperties (resend)");
            resolutionLogger.logResolution("email", configCache.getEnvironmentMode(),
                null, "resend-env", "env-var ResendEmailProvider",
                false, "ENV_FALLBACK", "SEND", request.to());
            WebClient webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(256 * 1024))
                .build();
            return new ResendEmailProvider(envProps, webClient, objectMapper).send(request);
        }

        log.debug("[DynamicEmail] No config available — using stub");
        resolutionLogger.logResolution("email", configCache.getEnvironmentMode(),
            null, "stub", "StubEmailProvider", false, "NO_CONFIG", "SEND", request.to());
        return new StubEmailProvider().send(request);
    }

    private boolean hasCredentials(EmailConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "resend" -> config.resendApiKey() != null && !config.resendApiKey().isBlank();
            case "sendgrid" -> config.sendgridApiKey() != null && !config.sendgridApiKey().isBlank();
            case "smtp" -> config.smtpHost() != null && !config.smtpHost().isBlank();
            default -> false;
        };
    }

    private EmailProvider buildDelegate(EmailConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "resend" -> {
                EmailProperties props = new EmailProperties();
                props.setResendApiKey(config.resendApiKey());
                props.setFromAddress(config.senderEmail() != null && !config.senderEmail().isBlank()
                    ? config.senderEmail() : "reports@qualscore.in");
                props.setFromName(config.senderName() != null && !config.senderName().isBlank()
                    ? config.senderName() : "QualScore");
                props.setReplyTo(config.replyToEmail());
                props.setTimeoutSeconds(15);

                WebClient webClient = webClientBuilder
                    .codecs(c -> c.defaultCodecs().maxInMemorySize(256 * 1024))
                    .build();
                yield new ResendEmailProvider(props, webClient, objectMapper);
            }
            default -> new StubEmailProvider();
        };
    }
}
