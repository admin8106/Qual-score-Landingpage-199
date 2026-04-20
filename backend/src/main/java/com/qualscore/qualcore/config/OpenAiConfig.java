package com.qualscore.qualcore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

/**
 * Typed configuration binding for OpenAI integration.
 *
 * All values are sourced from environment variables via application.yml.
 * No secrets are hardcoded here.
 *
 * Environment variable mapping:
 *   OPENAI_API_KEY          → integrations.openai.api-key
 *   OPENAI_MODEL            → integrations.openai.model
 *   OPENAI_MAX_TOKENS       → integrations.openai.max-tokens
 *   OPENAI_TEMPERATURE      → integrations.openai.temperature
 *   OPENAI_TIMEOUT_SECONDS  → integrations.openai.timeout-seconds
 *   OPENAI_MAX_RETRIES      → integrations.openai.max-retries
 *
 * ─────────────────────────────────────────────────────────
 * AI Architecture Notes — Two-Prompt Design:
 *
 * Prompt A: LinkedIn Analyzer
 *   Purpose: Analyze a LinkedIn profile and return 13 structured dimension scores.
 *   Status:  FUTURE-READY — wired in {@link com.qualscore.qualcore.linkedin.LinkedInAnalysisClient}
 *            Currently served by RuleBasedLinkedInAnalysisClient (no AI call).
 *   Activate: Implement AiPromptLinkedInClient, mark @Primary, configure OPENAI_API_KEY.
 *
 * Prompt B: Final Diagnostic Report Generator
 *   Purpose: Generate a full employability diagnostic report as strict JSON,
 *            using the candidate's scores, LinkedIn signals, and diagnostic answers.
 *   Status:  ACTIVE — wired in {@link com.qualscore.qualcore.service.ReportGenerationService}
 *            Falls back to rule-based output when API key is absent.
 *   Output:  Must be strict JSON — not free-form text.
 *            Uses OpenAI function-calling / response_format: json_object for enforcement.
 *
 * Both prompts share this config bean for client settings.
 * ─────────────────────────────────────────────────────────
 */
@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "integrations.openai")
public class OpenAiConfig {

    /**
     * OpenAI API key. Read from OPENAI_API_KEY environment variable.
     * Must never be logged in full — use {@link #maskedApiKey()} for logging.
     */
    private String apiKey = "";

    /**
     * OpenAI model ID.
     * Default: gpt-4o (optimized for JSON-structured output).
     * Production recommendation: gpt-4o or gpt-4-turbo for Prompt B.
     */
    private String model = "gpt-4o";

    /**
     * Maximum tokens to allow in the completion response.
     * Keep high enough for full JSON report; cap to avoid runaway costs.
     * Default: 2000 (sufficient for Prompt B report JSON).
     */
    private int maxTokens = 2000;

    /**
     * Sampling temperature for the model.
     * 0.0 = fully deterministic (recommended for structured JSON output).
     * 0.2–0.5 = slight variation (acceptable for narrative fields).
     * Default: 0.2 — low temperature for reliable JSON structure.
     */
    private double temperature = 0.2;

    /**
     * HTTP request timeout in seconds for each OpenAI API call.
     * Default: 60 seconds (generous for GPT-4 class models).
     */
    private int timeoutSeconds = 60;

    /**
     * Maximum number of retry attempts on malformed JSON or transient errors.
     * Does not retry on 4xx authentication errors.
     * Default: 1 (one retry = two total attempts maximum).
     */
    private int maxRetries = 1;

    /**
     * Whether to enable AI-based report generation (Prompt B).
     * When false, falls back to rule-based report generation.
     * Set to true only when OPENAI_API_KEY is configured.
     * Default: auto-detected from API key presence at runtime.
     */
    private boolean enabled = false;

    /**
     * Returns a safe masked version of the API key for logging.
     * Example: "sk-proj-****...abcd" (first 8 + last 4 chars visible).
     *
     * @return masked API key string safe for log output
     */
    public String maskedApiKey() {
        if (apiKey == null || apiKey.length() < 12) return "****";
        return apiKey.substring(0, 8) + "****" + apiKey.substring(apiKey.length() - 4);
    }

    /**
     * Returns true if the OpenAI integration is properly configured for use.
     * Checks both the config flag and actual API key presence.
     *
     * @return true if API key is present and non-blank
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
