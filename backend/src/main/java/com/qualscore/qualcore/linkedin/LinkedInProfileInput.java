package com.qualscore.qualcore.linkedin;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import lombok.Builder;
import lombok.Data;

/**
 * Structured input model for the LinkedIn analysis pipeline.
 *
 * This class is the normalized input contract used by ALL ingestion strategies.
 * The {@link LinkedInIngestionMode} field determines which fields are populated
 * and which analysis strategy should be invoked.
 *
 * ─────────────────────────────────────────────────────────
 * INGESTION STRATEGY FIELD MATRIX
 * ─────────────────────────────────────────────────────────
 *
 * ┌───────────────────────┬──────────┬────────────────┬──────────┬──────────┐
 * │ Field                 │ URL_ONLY │ CANDIDATE_TEXT │ ENRICHED │ FALLBACK │
 * ├───────────────────────┼──────────┼────────────────┼──────────┼──────────┤
 * │ linkedinUrl           │ Required │ Optional       │ Optional │ null     │
 * │ fullName              │ Required │ Required       │ Required │ null     │
 * │ currentRole           │ Required │ Required       │ Required │ null     │
 * │ experienceYears       │ Required │ Required       │ Required │ null     │
 * │ careerStage           │ Required │ Required       │ Required │ null     │
 * │ industry              │ Required │ Required       │ Required │ null     │
 * │ aboutText             │ null     │ Populated      │ Populated│ null     │
 * │ experienceText        │ null     │ Optional       │ Populated│ null     │
 * │ connectionCount       │ null     │ null           │ Populated│ null     │
 * │ recommendationCount   │ null     │ null           │ Populated│ null     │
 * │ certificationCount    │ null     │ null           │ Populated│ null     │
 * │ hasCustomHeadline     │ null     │ null           │ Populated│ null     │
 * │ experienceEntryCount  │ null     │ null           │ Populated│ null     │
 * └───────────────────────┴──────────┴────────────────┴──────────┴──────────┘
 *
 * ─────────────────────────────────────────────────────────
 * FUTURE INGESTION PATHS
 * ─────────────────────────────────────────────────────────
 *   ENRICHED via Proxycurl or equivalent API:
 *     Implement ProfileIngestionService strategy for ENRICHED mode.
 *     Populate all optional fields from the enrichment JSON response.
 *
 *   CANDIDATE_TEXT via form paste:
 *     Frontend posts aboutText and optional experienceText along with the profile form.
 *     ProfileIngestionService.build() selects CANDIDATE_TEXT mode when these fields are present.
 *
 *   EXPORT_FILE (future):
 *     Parse LinkedIn ZIP export → populate aboutText, experienceText, certificationCount, etc.
 *
 * ─────────────────────────────────────────────────────────
 * AI PROMPT A — FUTURE INTEGRATION
 * ─────────────────────────────────────────────────────────
 * When an AI-based analyzer is integrated, it should receive this input object,
 * extract the populated text fields, and return a strict JSON payload matching
 * the fields in {@link LinkedInAnalysisOutput}. Strict JSON mode must be enforced
 * via structured output / function-calling — not prompt hinting alone.
 */
@Data
@Builder
public class LinkedInProfileInput {

    /**
     * The ingestion mode that produced this input.
     * Required. Determines which fields are populated and which scoring path is used.
     */
    @Builder.Default
    private LinkedInIngestionMode ingestionMode = LinkedInIngestionMode.URL_ONLY;

    /**
     * The public LinkedIn profile URL.
     * Required for URL_ONLY and CANDIDATE_TEXT. Optional for ENRICHED.
     */
    private String linkedinUrl;

    /**
     * Candidate's full name — used for personalized insights.
     */
    private String fullName;

    /**
     * Candidate's current or most recent job title.
     */
    private String currentRole;

    /**
     * Candidate's total years of work experience (e.g. "5", "10+").
     */
    private String experienceYears;

    /**
     * Career stage enum — FRESHER or WORKING_PROFESSIONAL.
     * Used by rule-based scoring to calibrate expectations.
     */
    private CareerStage careerStage;

    /**
     * Candidate's target or current industry (e.g. "Technology", "Finance").
     */
    private String industry;

    /**
     * Raw "About" section text from the LinkedIn profile.
     * Populated in CANDIDATE_TEXT (candidate pastes it) and ENRICHED (API fetches it).
     * When present, improves aboutQuality and differentiationStrength scoring significantly.
     */
    private String aboutText;

    /**
     * Raw experience section text from the LinkedIn profile.
     * Populated in CANDIDATE_TEXT (optional paste) and ENRICHED (API fetches it).
     * When present, improves experiencePresentation and proofOfWorkVisibility scoring.
     */
    private String experienceText;

    /**
     * Total number of LinkedIn connections.
     * Populated from enrichment API. Drives activityVisibility score.
     */
    private Integer connectionCount;

    /**
     * Number of LinkedIn recommendations received.
     * Populated from enrichment API or candidate form. Drives recommendationSignal.
     */
    private Integer recommendationCount;

    /**
     * Number of certifications listed on the profile.
     * Populated from enrichment API or candidate form. Drives certificationsSignal.
     */
    private Integer certificationCount;

    /**
     * Whether the profile has a custom headline (not the default job title).
     * Populated from enrichment API. Drives headlineClarity.
     */
    private Boolean hasCustomHeadline;

    /**
     * Number of documented work experience entries listed on the profile.
     * Populated from enrichment API. Drives experiencePresentation.
     */
    private Integer experienceEntryCount;

    /**
     * Flag indicating whether profile data came from a live enrichment source.
     * true = enrichment API or real data. false = rule-based / form data only.
     */
    @Builder.Default
    private boolean enriched = false;

    /**
     * Source identifier string for logging and audit.
     * Should match the ingestionMode code.
     */
    @Builder.Default
    private String sourceType = LinkedInIngestionMode.URL_ONLY.getCode();
}
