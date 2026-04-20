package com.qualscore.qualcore.crm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.integration.config.FeatureFlagService;
import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.CrmConfigRow;
import com.qualscore.qualcore.integration.config.ProviderResolutionLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Optional;

/**
 * Dynamic CRM provider dispatcher.
 *
 * Resolves the active provider from ProviderConfigCache at each call.
 * Builds a fresh concrete provider instance using DB credentials so
 * changes made in the admin dashboard take effect on next cache refresh
 * without any server restart.
 *
 * Fallback order:
 *   1. DB primary provider with DB credentials
 *   2. DB fallback provider with DB credentials
 *   3. Env-var configured CrmProperties (WebhookCrmProvider if url present)
 *   4. StubCrmProvider (if feature flag OFF or no config at all)
 *
 * Feature flag: crm_push_enabled — when OFF, all pushes use the stub.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class DynamicCrmProvider implements CrmProvider {

    private final ProviderConfigCache configCache;
    private final ProviderResolutionLogger resolutionLogger;
    private final FeatureFlagService featureFlagService;
    private final CrmProperties envProps;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "dynamic-crm";
    }

    @Override
    public CrmPushResult push(CrmPushRequest request) {
        if (!featureFlagService.isEnabled("crm_push_enabled")) {
            log.info("[DynamicCrm] Feature flag 'crm_push_enabled' is OFF — using stub");
            resolutionLogger.logResolution("crm", configCache.getEnvironmentMode(),
                null, "stub", "StubCrmProvider", false, "FLAG_DISABLED", "PUSH",
                request.payload().candidateReference());
            return new StubCrmProvider().push(request);
        }

        Optional<CrmConfigRow> configOpt = configCache.getActiveCrmConfig();

        if (configOpt.isPresent()) {
            CrmConfigRow config = configOpt.get();
            boolean hasDbCreds = hasCredentials(config);

            if (hasDbCreds) {
                boolean wasFallback = config.isFallback();
                log.info("[DynamicCrm] Using DB config: provider={} env={} fallback={}",
                    config.providerCode(), config.environmentMode(), wasFallback);

                resolutionLogger.logResolution("crm", config.environmentMode(),
                    config.id(), config.providerCode(), config.providerName(),
                    wasFallback, wasFallback ? "FALLBACK_USED" : "RESOLVED", "PUSH",
                    request.payload().candidateReference());

                return buildDelegate(config).push(request);
            }
            log.debug("[DynamicCrm] DB config found but no credentials — falling through to env-var");
        }

        if (envProps.isEnabled() && envProps.isWebhookConfigured()) {
            log.debug("[DynamicCrm] No DB config — using env-var CrmProperties (webhook)");
            resolutionLogger.logResolution("crm", configCache.getEnvironmentMode(),
                null, "webhook-env", "env-var WebhookCrmProvider",
                false, "ENV_FALLBACK", "PUSH", request.payload().candidateReference());
            WebClient webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(256 * 1024))
                .build();
            return new WebhookCrmProvider(envProps, webClient, objectMapper).push(request);
        }

        log.debug("[DynamicCrm] No config available — using stub");
        resolutionLogger.logResolution("crm", configCache.getEnvironmentMode(),
            null, "stub", "StubCrmProvider", false, "NO_CONFIG", "PUSH",
            request.payload().candidateReference());
        return new StubCrmProvider().push(request);
    }

    private boolean hasCredentials(CrmConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "webhook" -> config.baseUrl() != null && !config.baseUrl().isBlank();
            default -> false;
        };
    }

    private CrmProvider buildDelegate(CrmConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "webhook" -> {
                CrmProperties props = new CrmProperties();
                props.setWebhookUrl(config.baseUrl());
                props.setWebhookSecret(config.authToken());
                props.setWebhookAuthHeader("Authorization");
                props.setWebhookAuthPrefix("Bearer ");
                props.setTimeoutSeconds(10);
                props.setMaxRetries(2);
                props.setEnabled(true);

                WebClient webClient = webClientBuilder
                    .codecs(c -> c.defaultCodecs().maxInMemorySize(256 * 1024))
                    .build();
                yield new WebhookCrmProvider(props, webClient, objectMapper);
            }
            default -> new StubCrmProvider();
        };
    }
}
