package com.qualscore.qualcore.enums;

/**
 * Represents the generation path and quality state of a DiagnosticReport.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GENERATION PATH STATUSES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * GENERATED_AI
 *   OpenAI call succeeded on attempt 1 or 2.
 *   All 10 required schema fields were present and valid.
 *   This is the highest-quality report state.
 *   (Canonical name for AI-generated reports going forward.)
 *
 * GENERATED_FALLBACK
 *   OpenAI was configured and called, but BOTH attempts failed.
 *   The report was generated using the deterministic rule-based fallback.
 *   rawAiResponse contains the last failed AI response for audit.
 *   aiFailureReason contains the structured failure cause.
 *   From the user's perspective, this is identical to GENERATED_AI.
 *   (Canonical name for fallback reports going forward.)
 *
 * GENERATED
 *   Legacy alias for GENERATED_AI. Kept for backwards compatibility with
 *   existing records. New reports will use GENERATED_AI.
 *
 * FALLBACK_USED
 *   Legacy alias for GENERATED_FALLBACK. Kept for backwards compatibility.
 *   New reports will use GENERATED_FALLBACK.
 *
 * RULE_BASED
 *   OpenAI was not configured (OPENAI_API_KEY not set).
 *   The report was generated using the deterministic template-based fallback.
 *   No AI call was attempted. rawAiResponse is null.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LIFECYCLE STATUSES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * FAILED
 *   Both AI and fallback report generation failed unexpectedly.
 *   Should not occur under normal conditions — indicates a system error.
 *   The report entity exists but content fields may be empty/null.
 *
 * REVIEWED
 *   An admin or QualScore analyst has reviewed this report.
 *   Content may have been edited post-generation.
 *
 * PUBLISHED
 *   Report has been formally published or shared with the candidate.
 *   Terminal state for candidate-facing reports.
 */
public enum ReportStatus {
    GENERATED_AI,
    GENERATED_FALLBACK,
    GENERATED,
    FALLBACK_USED,
    RULE_BASED,
    FAILED,
    REVIEWED,
    PUBLISHED
}
