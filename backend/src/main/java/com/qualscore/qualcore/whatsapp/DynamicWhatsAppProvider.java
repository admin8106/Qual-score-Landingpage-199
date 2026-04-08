package com.qualscore.qualcore.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.integration.config.FeatureFlagService;
import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.WhatsAppConfigRow;
import com.qualscore.qualcore.integration.config.ProviderResolutionLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Optional;

/**
 * Dynamic WhatsApp provider dispatcher.
 *
 * Resolves the active provider from ProviderConfigCache at each call.
 * Builds a fresh concrete provider instance using DB credentials so
 * changes made in the admin dashboard take effect on next cache refresh
 * (up to 60 seconds) without any server restart.
 *
 * Fallback order:
 *   1. DB primary provider with DB credentials
 *   2. DB fallback provider with DB credentials
 *   3. Env-var configured WhatsAppProperties (MetaCloudWhatsAppProvider or Stub)
 *   4. StubWhatsAppProvider (if feature flag is OFF or no config at all)
 *
 * Feature flag: whatsapp_send_enabled — when OFF, all sends use the stub.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class DynamicWhatsAppProvider implements WhatsAppProvider {

    private final ProviderConfigCache configCache;
    private final ProviderResolutionLogger resolutionLogger;
    private final FeatureFlagService featureFlagService;
    private final WhatsAppProperties envProps;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "dynamic-whatsapp";
    }

    @Override
    public WhatsAppSendResult send(WhatsAppSendRequest request) {
        if (!featureFlagService.isEnabled("whatsapp_send_enabled")) {
            log.info("[DynamicWhatsApp] Feature flag 'whatsapp_send_enabled' is OFF — using stub");
            resolutionLogger.logResolution("whatsapp", configCache.getEnvironmentMode(),
                null, "stub", "StubWhatsAppProvider",
                false, "FLAG_DISABLED", "SEND", request.to());
            return new StubWhatsAppProvider().send(request);
        }

        Optional<WhatsAppConfigRow> configOpt = configCache.getActiveWhatsAppConfig();

        if (configOpt.isPresent()) {
            WhatsAppConfigRow config = configOpt.get();
            boolean hasDbCreds = config.metaAccessToken() != null && !config.metaAccessToken().isBlank()
                && config.metaPhoneNumberId() != null && !config.metaPhoneNumberId().isBlank();

            if (hasDbCreds) {
                boolean wasFallback = config.isFallback();
                log.info("[DynamicWhatsApp] Using DB config: provider={} env={} fallback={}",
                    config.providerCode(), config.environmentMode(), wasFallback);

                resolutionLogger.logResolution("whatsapp", config.environmentMode(),
                    config.id(), config.providerCode(), config.providerName(),
                    wasFallback, wasFallback ? "FALLBACK_USED" : "RESOLVED", "SEND", request.to());

                return buildDelegate(config).send(request);
            }
            log.debug("[DynamicWhatsApp] DB config found but no credentials — falling through to env-var");
        }

        if (envProps.isConfigured()) {
            log.debug("[DynamicWhatsApp] No DB config — using env-var WhatsAppProperties (meta)");
            resolutionLogger.logResolution("whatsapp", configCache.getEnvironmentMode(),
                null, "meta-env", "env-var MetaCloudWhatsAppProvider",
                false, "ENV_FALLBACK", "SEND", request.to());
            WebClient webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(512 * 1024))
                .build();
            return new MetaCloudWhatsAppProvider(envProps, webClient, objectMapper).send(request);
        }

        log.debug("[DynamicWhatsApp] No config available — using stub");
        resolutionLogger.logResolution("whatsapp", configCache.getEnvironmentMode(),
            null, "stub", "StubWhatsAppProvider", false, "NO_CONFIG", "SEND", request.to());
        return new StubWhatsAppProvider().send(request);
    }

    private WhatsAppProvider buildDelegate(WhatsAppConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "meta", "meta_cloud" -> {
                WhatsAppProperties props = new WhatsAppProperties();
                props.setAccessToken(config.metaAccessToken());
                props.setPhoneNumberId(config.metaPhoneNumberId());
                props.setBusinessAccountId(config.metaBusinessAccountId());
                props.setApiVersion(config.metaApiVersion() != null ? config.metaApiVersion() : "v19.0");
                props.setWebhookVerifyToken(config.metaWebhookVerifyToken());
                props.setTimeoutSeconds(15);

                WebClient webClient = webClientBuilder
                    .codecs(c -> c.defaultCodecs().maxInMemorySize(512 * 1024))
                    .build();
                yield new MetaCloudWhatsAppProvider(props, webClient, objectMapper);
            }
            default -> new StubWhatsAppProvider();
        };
    }
}
