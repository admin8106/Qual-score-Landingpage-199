package com.qualscore.qualcore.openai;

import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.integration.config.FeatureFlagService;
import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.AiConfigRow;
import com.qualscore.qualcore.integration.config.ProviderResolutionLogger;
import com.qualscore.qualcore.openai.dto.AiCallResult;
import com.qualscore.qualcore.openai.dto.ChatRequest;
import com.qualscore.qualcore.openai.dto.ChatResponse;
import com.qualscore.qualcore.openai.dto.ResponseFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Optional;

/**
 * Dynamic AI client that resolves the active provider from the DB config cache at call time.
 *
 * Resolution order:
 *   1. DB primary provider for current environment mode
 *   2. DB fallback provider for current environment mode
 *   3. Env-var based OpenAiClient (legacy / startup fallback)
 *   4. Disabled response (if ai_enabled feature flag is OFF)
 *
 * Logs every resolution decision to provider_resolution_logs asynchronously.
 * Never throws — returns a failed AiCallResult on any error.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DynamicAiClient {

    private final OpenAiClient openAiClient;
    private final OpenAiConfig openAiConfig;
    private final ProviderConfigCache configCache;
    private final ProviderResolutionLogger resolutionLogger;
    private final FeatureFlagService featureFlagService;
    private final WebClient.Builder webClientBuilder;

    public AiCallResult complete(ChatRequest request, int attemptNumber) {
        if (!featureFlagService.isEnabled("ai_enabled")) {
            log.info("[DynamicAI] Feature flag 'ai_enabled' is OFF");
            resolutionLogger.logResolution("ai", configCache.getEnvironmentMode(),
                null, "none", "disabled", false, "FLAG_DISABLED", "COMPLETE",
                request.getUserReference());
            return AiCallResult.builder()
                .success(false)
                .errorMessage("AI feature disabled via feature flag")
                .attemptNumber(attemptNumber)
                .build();
        }

        Optional<AiConfigRow> dbConfigOpt = configCache.getActiveAiConfig();

        if (dbConfigOpt.isPresent()) {
            AiConfigRow config = dbConfigOpt.get();

            if (config.apiKeyEncrypted() == null || config.apiKeyEncrypted().isBlank()) {
                log.warn("[DynamicAI] DB AI config found but has no API key — falling back to env-var client");
            } else {
                log.info("[DynamicAI] Using DB config: provider={} model={} env={} fallback={} attempt={}",
                    config.providerCode(), config.modelName(), config.environmentMode(),
                    config.isFallback(), attemptNumber);

                resolutionLogger.logResolution("ai", config.environmentMode(),
                    config.id(), config.providerCode(), config.providerName(),
                    config.isFallback(), config.isFallback() ? "FALLBACK_USED" : "RESOLVED",
                    "COMPLETE", request.getUserReference());

                ChatRequest dbRequest = ChatRequest.builder()
                    .model(config.modelName() != null ? config.modelName() : "gpt-4o")
                    .messages(request.getMessages())
                    .maxTokens(config.maxTokens() > 0 ? config.maxTokens() : request.getMaxTokens())
                    .temperature(config.temperature() > 0 ? config.temperature() : request.getTemperature())
                    .responseFormat(config.jsonStrictMode() ? ResponseFormat.jsonObject() : request.getResponseFormat())
                    .userReference(request.getUserReference())
                    .build();

                String baseUrl = (config.baseUrl() != null && !config.baseUrl().isBlank())
                    ? config.baseUrl() : "https://api.openai.com";

                return executeWithCredentials(dbRequest, config.apiKeyEncrypted(), baseUrl,
                    config.timeoutSeconds() > 0 ? config.timeoutSeconds() : 60, attemptNumber);
            }
        }

        log.debug("[DynamicAI] No active DB config — using env-var OpenAiClient. attempt={}", attemptNumber);
        resolutionLogger.logResolution("ai", configCache.getEnvironmentMode(),
            null, "openai-env", "env-var OpenAiClient", false, "ENV_FALLBACK",
            "COMPLETE", request.getUserReference());

        return openAiClient.complete(request, attemptNumber);
    }

    public AiCallResult complete(ChatRequest request) {
        return complete(request, 1);
    }

    /**
     * Returns true if AI generation is available via DB config or env-var config.
     * Used by ReportGenerationServiceImpl to decide AI vs rule-based report path.
     */
    public boolean isConfigured() {
        Optional<AiConfigRow> dbConfig = configCache.getActiveAiConfig();
        if (dbConfig.isPresent()) {
            String key = dbConfig.get().apiKeyEncrypted();
            if (key != null && !key.isBlank()) return true;
        }
        return openAiConfig.isConfigured();
    }

    /**
     * Returns the max retry count: DB config value if available, else env-var config.
     */
    public int getMaxRetries() {
        Optional<AiConfigRow> dbConfig = configCache.getActiveAiConfig();
        if (dbConfig.isPresent() && dbConfig.get().retryCount() > 0) {
            return dbConfig.get().retryCount();
        }
        return openAiConfig.getMaxRetries();
    }

    private AiCallResult executeWithCredentials(ChatRequest request, String apiKey,
                                                  String baseUrl, int timeoutSeconds,
                                                  int attemptNumber) {
        WebClient webClient = webClientBuilder.baseUrl(baseUrl).build();
        try {
            ChatResponse response = webClient.post()
                .uri("/v1/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, r -> r.createException())
                .onStatus(HttpStatusCode::is5xxServerError, r -> r.createException())
                .bodyToMono(ChatResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();

            if (response == null) {
                return AiCallResult.builder().success(false)
                    .errorMessage("Null response from AI provider")
                    .attemptNumber(attemptNumber).build();
            }

            String rawContent   = response.firstContent();
            String finishReason = response.firstFinishReason();

            if (response.getUsage() != null) {
                log.info("[DynamicAI] Token usage: prompt={} completion={} total={} attempt={}",
                    response.getUsage().getPromptTokens(),
                    response.getUsage().getCompletionTokens(),
                    response.getUsage().getTotalTokens(),
                    attemptNumber);
            }

            if (rawContent == null || rawContent.isBlank()) {
                return AiCallResult.builder().success(false)
                    .errorMessage("Empty content from AI provider")
                    .rawContent(rawContent).finishReason(finishReason)
                    .attemptNumber(attemptNumber).build();
            }

            if (!"stop".equals(finishReason)) {
                return AiCallResult.builder().success(false)
                    .errorMessage("Response truncated: finishReason=" + finishReason)
                    .rawContent(rawContent).finishReason(finishReason)
                    .attemptNumber(attemptNumber).build();
            }

            return AiCallResult.builder().success(true)
                .rawContent(rawContent).parsedJson(rawContent)
                .finishReason(finishReason).usage(response.getUsage())
                .attemptNumber(attemptNumber).build();

        } catch (Exception ex) {
            log.error("[DynamicAI] Call failed (attempt={}): {}", attemptNumber, ex.getMessage(), ex);
            return AiCallResult.builder().success(false)
                .errorMessage("Error: " + ex.getMessage())
                .attemptNumber(attemptNumber).build();
        }
    }
}
