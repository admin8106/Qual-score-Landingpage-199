package com.qualscore.qualcore.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Represents the ingestion strategy used to gather LinkedIn profile data for analysis.
 *
 * ─────────────────────────────────────────────────────────
 * INGESTION MODES (in order of data richness)
 * ─────────────────────────────────────────────────────────
 *
 * URL_ONLY
 *   Only a LinkedIn URL was submitted — no profile content available.
 *   Analysis is rule-based from candidate form data (role, stage, industry, experience).
 *   Confidence: LOW. Coverage: PARTIAL.
 *   This is the current default for all candidates.
 *
 * CANDIDATE_TEXT
 *   The candidate pasted their LinkedIn About section and/or experience text.
 *   Text is available for AI Prompt A or enhanced rule-based scoring.
 *   Confidence: MEDIUM. Coverage: PARTIAL (text only, no structured data).
 *
 * ENRICHED
 *   Full structured profile data was fetched from a controlled enrichment API
 *   (e.g. Proxycurl or equivalent consented service).
 *   All 13 dimensions can be scored from real structured data.
 *   Confidence: HIGH. Coverage: FULL.
 *   Requires active enrichment API configuration.
 *
 * FALLBACK
 *   No LinkedIn data was available or all ingestion attempts failed.
 *   Neutral baseline scores (5/10) are used for all dimensions.
 *   Confidence: NONE. Coverage: NONE.
 *   Report generation should acknowledge the absence of LinkedIn data.
 *
 * ─────────────────────────────────────────────────────────
 * EXTENSIBILITY
 * ─────────────────────────────────────────────────────────
 * Future modes to add here:
 *   EXPORT_FILE  — candidate uploads their LinkedIn data export ZIP/JSON
 *   OAUTH_FLOW   — candidate grants OAuth access for API reading (if LinkedIn permits)
 */
@Getter
@RequiredArgsConstructor
public enum LinkedInIngestionMode {

    URL_ONLY(
            "url_only",
            "URL Only",
            "Analysis based on form-submitted candidate data. No LinkedIn content was read.",
            AnalysisConfidence.LOW,
            AnalysisCoverage.PARTIAL
    ),

    CANDIDATE_TEXT(
            "candidate_text",
            "Candidate-Provided Text",
            "Analysis based on profile text submitted by the candidate (About and/or experience sections).",
            AnalysisConfidence.MEDIUM,
            AnalysisCoverage.PARTIAL
    ),

    ENRICHED(
            "enriched",
            "Enrichment API",
            "Analysis based on structured profile data from a controlled enrichment API.",
            AnalysisConfidence.HIGH,
            AnalysisCoverage.FULL
    ),

    FALLBACK(
            "fallback",
            "Fallback (No Data)",
            "No LinkedIn data was available. Neutral baseline scores applied.",
            AnalysisConfidence.NONE,
            AnalysisCoverage.NONE
    );

    private final String code;
    private final String label;
    private final String description;
    private final AnalysisConfidence defaultConfidence;
    private final AnalysisCoverage defaultCoverage;

    /**
     * Analysis confidence level — how reliable the dimension scores are.
     */
    public enum AnalysisConfidence {
        NONE,
        LOW,
        MEDIUM,
        HIGH
    }

    /**
     * How much of the LinkedIn profile was covered by the ingestion.
     */
    public enum AnalysisCoverage {
        NONE,
        PARTIAL,
        FULL
    }
}
