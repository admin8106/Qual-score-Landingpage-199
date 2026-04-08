package com.qualscore.qualcore.service;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;

import java.util.Map;

/**
 * Service contract for AI-powered diagnostic report generation (Prompt B).
 *
 * This service orchestrates the full Prompt B pipeline:
 *   1. Build the {@link com.qualscore.qualcore.openai.ReportPromptContext}
 *      from candidate, score, and LinkedIn data
 *   2. Call {@link com.qualscore.qualcore.openai.OpenAiClient} with the prompt
 *   3. Parse and validate the JSON response via {@link com.qualscore.qualcore.openai.AiJsonParser}
 *   4. Retry once on malformed JSON
 *   5. Persist the raw AI response in {@link com.qualscore.qualcore.entity.DiagnosticReport}
 *   6. Fall back to rule-based generation if AI is unavailable or fails
 *
 * The return value is a Map<String, Object> representing the report content.
 * This is intentionally flexible to support schema evolution without breaking
 * the persistence and response layers.
 */
public interface ReportGenerationService {

    /**
     * Generate a diagnostic report for the given candidate.
     *
     * Uses Prompt B (AI) if OpenAI is configured and reachable.
     * Falls back to rule-based report if AI is unavailable or returns invalid JSON.
     *
     * The generated report is persisted to the database as part of this call.
     *
     * @param candidate      the candidate profile entity
     * @param score          the computed diagnostic score entity
     * @param linkedInResult the latest LinkedIn analysis result (may be null)
     * @return report content map (persisted and returned for response building)
     */
    Map<String, Object> generateAndPersist(CandidateProfile candidate,
                                            DiagnosticScore score,
                                            LinkedInAnalysisResult linkedInResult);
}
