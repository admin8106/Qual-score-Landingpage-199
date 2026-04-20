package com.qualscore.qualcore.linkedin;

/**
 * Pluggable strategy interface for LinkedIn profile analysis.
 *
 * Each implementation represents a distinct ingestion/analysis path.
 * The active implementation is selected at runtime via Spring's {@code @Primary}
 * annotation or qualifier-based injection.
 *
 * ─────────────────────────────────────────────────────────
 * Current implementation:
 *   {@link RuleBasedLinkedInAnalysisClient} — rule-based mock using form data
 *
 * Planned future implementations (in order of priority):
 *
 *   1. ManualIngestionLinkedInClient
 *      → Candidate submits raw LinkedIn "About" + Experience text via a form.
 *      → Text is parsed into {@link LinkedInProfileInput} fields.
 *      → Sent to AI Prompt A for structured scoring.
 *
 *   2. EnrichmentApiLinkedInClient
 *      → Calls a controlled enrichment API (e.g. Proxycurl) to fetch structured profile JSON.
 *      → JSON is normalized into {@link LinkedInProfileInput}.
 *      → Sent to AI Prompt A for scoring, or rule-scored from structured fields.
 *
 *   3. InternalParserLinkedInClient
 *      → A QualScore-owned parser for consented profile exports (LinkedIn data download).
 *      → Parses ZIP/JSON export into {@link LinkedInProfileInput}.
 *      → Scored via AI Prompt A or internal rule engine.
 *
 *   4. AiPromptLinkedInClient (Prompt A)
 *      → Receives {@link LinkedInProfileInput} with raw text fields populated.
 *      → Calls OpenAI (or equivalent) with a strict JSON function-calling prompt.
 *      → Returns a validated {@link LinkedInAnalysisOutput} parsed from the LLM response.
 *      → IMPORTANT: Must enforce strict JSON schema — not rely on prompt hinting alone.
 *
 * ─────────────────────────────────────────────────────────
 * Design Notes:
 *   - All clients MUST be stateless and thread-safe.
 *   - All clients MUST populate the {@code sourceType} and {@code mock} fields in output.
 *   - Clients MUST NOT call the database — persistence is handled by the service layer.
 *   - If a client fails, the service layer catches the exception and falls back gracefully.
 * ─────────────────────────────────────────────────────────
 */
public interface LinkedInAnalysisClient {

    /**
     * Analyze the given LinkedIn profile input and return a structured analysis output.
     *
     * @param input the normalized input containing profile signals and metadata
     * @return a fully populated {@link LinkedInAnalysisOutput} with all 13 dimensions scored
     */
    LinkedInAnalysisOutput analyze(LinkedInProfileInput input);

    /**
     * Returns the source type identifier for this client.
     * Used for logging, auditing, and the {@code sourceType} field in output.
     *
     * @return source type string (e.g. "RULE_BASED", "ENRICHMENT_API", "AI_PROMPT")
     */
    String getSourceType();
}
