package com.qualscore.qualcore.service;

import com.qualscore.qualcore.linkedin.LinkedInAnalysisOutput;
import com.qualscore.qualcore.linkedin.LinkedInProfileInput;

import java.util.UUID;

/**
 * Service contract for LinkedIn profile analysis.
 *
 * Orchestrates the full analysis pipeline:
 *   1. Delegates analysis to the active {@link com.qualscore.qualcore.linkedin.LinkedInAnalysisClient}
 *   2. Normalizes dimension scores via {@link com.qualscore.qualcore.linkedin.LinkedInScoreNormalizer}
 *   3. Persists the result to {@code linkedin_analysis_results} via the repository
 *   4. Returns the canonical {@link LinkedInAnalysisOutput}
 *
 * The service is decoupled from the analysis strategy — swapping ingestion paths
 * requires no changes here, only to the active {@code LinkedInAnalysisClient} bean.
 */
public interface LinkedInAnalysisService {

    /**
     * Analyze a LinkedIn profile and persist the result for the given candidate.
     *
     * @param input              normalized profile input from any ingestion source
     * @param candidateProfileId the UUID of the associated candidate profile (for persistence)
     * @return the canonical structured analysis output
     */
    LinkedInAnalysisOutput analyzeAndPersist(LinkedInProfileInput input, UUID candidateProfileId);

    /**
     * Analyze a LinkedIn profile without persisting the result.
     * Used for preview, validation, or re-analysis scenarios.
     *
     * @param input normalized profile input
     * @return the canonical structured analysis output (not saved to DB)
     */
    LinkedInAnalysisOutput analyzeOnly(LinkedInProfileInput input);
}
