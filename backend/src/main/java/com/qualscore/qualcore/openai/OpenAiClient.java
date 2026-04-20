package com.qualscore.qualcore.openai;

import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.openai.dto.AiCallResult;
import com.qualscore.qualcore.openai.dto.ChatRequest;
import com.qualscore.qualcore.openai.dto.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;

/**
 * Low-level HTTP client for the OpenAI Chat Completions API.
 *
 * Responsibilities:
 *   1. Send chat completion requests with proper auth headers (API key masked in logs)
 *   2. Handle HTTP errors (4xx, 5xx) with structured error state — no raw exceptions bubble up
 *   3. Apply configurable timeout per request
 *   4. Support one retry on malformed JSON (retry logic driven by caller)
 *   5. Return {@link AiCallResult} always — success or failure — never throw to service layer
 *
 * ─────────────────────────────────────────────────────────
 * Security & Logging Policy:
 *   - API key is NEVER logged. Use {@link OpenAiConfig#maskedApiKey()} for any log output.
 *   - Request message content is logged at DEBUG level only (not WARN/INFO).
 *   - Raw AI responses are logged at TRACE level.
 *   - Token usage is always logged at INFO for cost monitoring.
 * ─────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────
 * Retry Policy:
 *   - Retry once on: malformed JSON, truncated response (finishReason="length")
 *   - Do NOT retry on: HTTP 401, 403 (auth failures — no point retrying)
 *   - Do NOT retry on: HTTP 429 (rate limit — caller should implement backoff)
 *   - The retry decision is made by the service layer ({@link com.qualscore.qualcore.service.ReportGenerationService})
 *     after inspecting {@link AiCallResult#isSuccess()}
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Component
public class OpenAiClient {

    private static final String OPENAI_BASE_URL = "https://api.openai.com";
    private static final String CHAT_COMPLETIONS_PATH = "/v1/chat/completions";
    private static final String FINISH_REASON_STOP = "stop";

    private final OpenAiConfig config;
    private final WebClient webClient;

    public OpenAiClient(OpenAiConfig config, WebClient.Builder webClientBuilder) {
        this.config = config;
        this.webClient = webClientBuilder
                .baseUrl(OPENAI_BASE_URL)
                .build();
    }

    /**
     * Execute a chat completion request and return a structured result.
     *
     * This method never throws. All errors are captured in {@link AiCallResult}.
     *
     * @param request       the fully-constructed chat request
     * @param attemptNumber which attempt this is (1 = first, 2 = retry)
     * @return a result object containing success state, raw content, and error info
     */
    public AiCallResult complete(ChatRequest request, int attemptNumber) {
        if (!config.isConfigured()) {
            log.warn("[OpenAI] API key not configured — skipping AI call (attempt={})", attemptNumber);
            return AiCallResult.builder()
                    .success(false)
                    .errorMessage("OpenAI API key not configured")
                    .attemptNumber(attemptNumber)
                    .build();
        }

        log.info("[OpenAI] Sending chat completion: model={}, maxTokens={}, attempt={}, ref={}",
                request.getModel(), request.getMaxTokens(), attemptNumber, request.getUserReference());
        log.debug("[OpenAI] API key (masked): {}", config.maskedApiKey());

        try {
            ChatResponse response = webClient.post()
                    .uri(CHAT_COMPLETIONS_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + config.getApiKey())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, clientResponse -> {
                        log.error("[OpenAI] 4xx error: status={}", clientResponse.statusCode().value());
                        return clientResponse.createException();
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, clientResponse -> {
                        log.error("[OpenAI] 5xx error: status={}", clientResponse.statusCode().value());
                        return clientResponse.createException();
                    })
                    .bodyToMono(ChatResponse.class)
                    .timeout(Duration.ofSeconds(config.getTimeoutSeconds()))
                    .block();

            if (response == null) {
                return failResult("OpenAI returned null response", null, null, attemptNumber);
            }

            String rawContent   = response.firstContent();
            String finishReason = response.firstFinishReason();
            logUsage(response, attemptNumber);
            log.trace("[OpenAI] Raw response content (attempt={}): {}", attemptNumber, rawContent);

            if (rawContent == null || rawContent.isBlank()) {
                return failResult("OpenAI returned empty content", rawContent, finishReason, attemptNumber);
            }

            if (!FINISH_REASON_STOP.equals(finishReason)) {
                log.warn("[OpenAI] Non-stop finish reason: {} — response may be truncated (attempt={})",
                        finishReason, attemptNumber);
                return failResult("Response truncated: finishReason=" + finishReason, rawContent, finishReason, attemptNumber);
            }

            return AiCallResult.builder()
                    .success(true)
                    .rawContent(rawContent)
                    .parsedJson(rawContent)
                    .finishReason(finishReason)
                    .usage(response.getUsage())
                    .attemptNumber(attemptNumber)
                    .build();

        } catch (WebClientResponseException e) {
            boolean isAuthError = e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403;
            log.error("[OpenAI] HTTP error: status={}, isAuth={}, message={} (attempt={})",
                    e.getStatusCode().value(), isAuthError, e.getMessage(), attemptNumber);
            return failResult("HTTP " + e.getStatusCode().value() + ": " + sanitizeErrorBody(e.getResponseBodyAsString()),
                    null, null, attemptNumber);

        } catch (Exception e) {
            log.error("[OpenAI] Unexpected error during completion (attempt={}): {}", attemptNumber, e.getMessage(), e);
            return failResult("Unexpected error: " + e.getMessage(), null, null, attemptNumber);
        }
    }

    /**
     * Convenience method — calls with attempt number 1.
     */
    public AiCallResult complete(ChatRequest request) {
        return complete(request, 1);
    }

    private AiCallResult failResult(String error, String rawContent, String finishReason, int attempt) {
        return AiCallResult.builder()
                .success(false)
                .errorMessage(error)
                .rawContent(rawContent)
                .finishReason(finishReason)
                .attemptNumber(attempt)
                .build();
    }

    private void logUsage(ChatResponse response, int attempt) {
        if (response.getUsage() != null) {
            log.info("[OpenAI] Token usage: prompt={}, completion={}, total={} (attempt={})",
                    response.getUsage().getPromptTokens(),
                    response.getUsage().getCompletionTokens(),
                    response.getUsage().getTotalTokens(),
                    attempt);
        }
    }

    /**
     * Strips any sensitive content from error bodies before logging.
     * Truncates at 200 chars to prevent flooding logs.
     */
    private String sanitizeErrorBody(String body) {
        if (body == null || body.isBlank()) return "(empty)";
        String cleaned = body.replaceAll("\"api_key\"\\s*:\\s*\"[^\"]+\"", "\"api_key\": \"****\"");
        return cleaned.length() > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
    }
}
