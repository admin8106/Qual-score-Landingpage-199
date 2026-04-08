package com.qualscore.qualcore.linkedin;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import com.qualscore.qualcore.validation.LinkedInUrlValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Strategy factory for LinkedIn profile ingestion.
 *
 * This service selects the appropriate ingestion mode and constructs a
 * {@link LinkedInProfileInput} object from the available candidate data.
 * It is the single entry point for the orchestration layer — callers never
 * construct {@link LinkedInProfileInput} directly.
 *
 * ─────────────────────────────────────────────────────────
 * STRATEGY SELECTION LOGIC (precedence order)
 * ─────────────────────────────────────────────────────────
 *
 * 1. FALLBACK
 *    - Triggered when: no LinkedIn URL and no profile text provided.
 *    - Result: neutral baseline input with no profile signals.
 *    - Confidence: NONE. Coverage: NONE.
 *
 * 2. CANDIDATE_TEXT
 *    - Triggered when: aboutText (and optionally experienceText) is provided.
 *    - Result: input enriched with candidate-supplied text for text-aware scoring.
 *    - Confidence: MEDIUM. Coverage: PARTIAL.
 *    - LinkedIn URL is retained if present but not required.
 *
 * 3. URL_ONLY
 *    - Triggered when: a LinkedIn URL is present but no profile text is supplied.
 *    - Result: input built from candidate form data (role, stage, industry, experience).
 *    - Confidence: LOW. Coverage: PARTIAL.
 *    - This is the current production default.
 *
 * ─────────────────────────────────────────────────────────
 * ADDING NEW STRATEGIES
 * ─────────────────────────────────────────────────────────
 *
 * ENRICHED (Proxycurl or equivalent):
 *   1. Add a call to the enrichment API client here or in a sub-method.
 *   2. Populate all optional fields (connectionCount, experienceEntryCount, etc.).
 *   3. Set ingestionMode = ENRICHED, enriched = true.
 *   4. Insert strategy check before URL_ONLY in the selection order.
 *
 * EXPORT_FILE (LinkedIn data export):
 *   1. Accept a parsed export DTO as an additional parameter.
 *   2. Extract aboutText, experienceText, certificationCount, etc.
 *   3. Set ingestionMode = CANDIDATE_TEXT (or a new EXPORT_FILE mode if added).
 *
 * ─────────────────────────────────────────────────────────
 * ANALYSIS CONFIDENCE DISCLOSURE
 * ─────────────────────────────────────────────────────────
 * The ingestion mode carries confidence and coverage metadata via
 * {@link LinkedInIngestionMode#getDefaultConfidence()} and
 * {@link LinkedInIngestionMode#getDefaultCoverage()}.
 *
 * These are propagated to {@link LinkedInAnalysisOutput} and persisted in the
 * {@code linkedin_analysis_results} table. The report generation prompt can then
 * reference the confidence level to qualify LinkedIn insights appropriately.
 *
 * For example: at LOW confidence (URL_ONLY mode), the report notes that LinkedIn
 * analysis is based on form data, not direct profile content. At MEDIUM, the
 * report can reference the candidate's actual About section text with more authority.
 */
@Slf4j
@Service
public class ProfileIngestionService {

    /**
     * Builds a {@link LinkedInProfileInput} using the best available strategy
     * given the candidate data and any supplemental profile text.
     *
     * @param candidate       the candidate profile entity (provides role, stage, industry, experience, URL)
     * @param aboutText       candidate-pasted About section text, or null
     * @param experienceText  candidate-pasted experience text, or null
     * @return a fully constructed input ready for the analysis client
     */
    public LinkedInProfileInput build(CandidateProfile candidate,
                                      String aboutText,
                                      String experienceText) {
        boolean hasAbout = hasContent(aboutText);
        boolean hasUrl   = hasValidLinkedInUrl(candidate);

        LinkedInIngestionMode mode = selectMode(hasUrl, hasAbout);

        log.info("[ProfileIngestion] Mode selected: {} (hasUrl={}, hasAboutText={}) candidateCode={}",
                mode, hasUrl, hasAbout, candidate.getCandidateCode());

        return switch (mode) {
            case CANDIDATE_TEXT -> buildCandidateTextInput(candidate, aboutText, experienceText, mode);
            case URL_ONLY       -> buildUrlOnlyInput(candidate, mode);
            case FALLBACK       -> buildFallbackInput(candidate, mode);
            default             -> buildFallbackInput(candidate, mode);
        };
    }

    /**
     * Convenience overload when no supplemental profile text is available.
     * Selects URL_ONLY or FALLBACK based on whether a LinkedIn URL is present.
     */
    public LinkedInProfileInput build(CandidateProfile candidate) {
        return build(candidate, null, null);
    }

    /**
     * Builds a CANDIDATE_TEXT mode input from candidate-provided profile text.
     * Used by the frontend "paste profile text" flow.
     *
     * @param candidate      candidate profile entity
     * @param aboutText      About section text (required — caller guarantees non-blank)
     * @param experienceText Experience text (optional)
     * @return CANDIDATE_TEXT mode input
     */
    public LinkedInProfileInput buildFromCandidateText(CandidateProfile candidate,
                                                        String aboutText,
                                                        String experienceText) {
        return buildCandidateTextInput(candidate, aboutText, experienceText, LinkedInIngestionMode.CANDIDATE_TEXT);
    }

    /**
     * Builds an ENRICHED mode input from structured enrichment API data.
     * Called by future EnrichmentApiLinkedInClient or equivalent.
     *
     * @param candidate            candidate profile entity
     * @param aboutText            About text from enrichment
     * @param experienceText       Experience text from enrichment
     * @param connectionCount      Connection count from enrichment
     * @param recommendationCount  Recommendation count from enrichment
     * @param certificationCount   Certification count from enrichment
     * @param hasCustomHeadline    Whether profile has custom headline
     * @param experienceEntryCount Number of experience entries
     * @return ENRICHED mode input
     */
    public LinkedInProfileInput buildFromEnrichment(CandidateProfile candidate,
                                                     String aboutText,
                                                     String experienceText,
                                                     Integer connectionCount,
                                                     Integer recommendationCount,
                                                     Integer certificationCount,
                                                     Boolean hasCustomHeadline,
                                                     Integer experienceEntryCount) {
        LinkedInIngestionMode mode = LinkedInIngestionMode.ENRICHED;
        log.info("[ProfileIngestion] Building ENRICHED input: candidateCode={}", candidate.getCandidateCode());

        return LinkedInProfileInput.builder()
                .ingestionMode(mode)
                .linkedinUrl(candidate.getLinkedinUrl())
                .fullName(candidate.getFullName())
                .currentRole(nvl(candidate.getCurrentRole(), "Professional"))
                .experienceYears(candidate.getTotalExperienceYears())
                .careerStage(candidate.getCareerStage())
                .industry(nvl(candidate.getIndustry(), "General"))
                .aboutText(aboutText)
                .experienceText(experienceText)
                .connectionCount(connectionCount)
                .recommendationCount(recommendationCount)
                .certificationCount(certificationCount)
                .hasCustomHeadline(hasCustomHeadline)
                .experienceEntryCount(experienceEntryCount)
                .enriched(true)
                .sourceType(mode.getCode())
                .build();
    }

    private LinkedInIngestionMode selectMode(boolean hasUrl, boolean hasAbout) {
        if (hasAbout) return LinkedInIngestionMode.CANDIDATE_TEXT;
        if (hasUrl)   return LinkedInIngestionMode.URL_ONLY;
        return LinkedInIngestionMode.FALLBACK;
    }

    private LinkedInProfileInput buildUrlOnlyInput(CandidateProfile candidate, LinkedInIngestionMode mode) {
        return LinkedInProfileInput.builder()
                .ingestionMode(mode)
                .linkedinUrl(candidate.getLinkedinUrl())
                .fullName(candidate.getFullName())
                .currentRole(nvl(candidate.getCurrentRole(), "Professional"))
                .experienceYears(candidate.getTotalExperienceYears())
                .careerStage(candidate.getCareerStage())
                .industry(nvl(candidate.getIndustry(), "General"))
                .enriched(false)
                .sourceType(mode.getCode())
                .build();
    }

    private LinkedInProfileInput buildCandidateTextInput(CandidateProfile candidate,
                                                          String aboutText,
                                                          String experienceText,
                                                          LinkedInIngestionMode mode) {
        return LinkedInProfileInput.builder()
                .ingestionMode(mode)
                .linkedinUrl(candidate.getLinkedinUrl())
                .fullName(candidate.getFullName())
                .currentRole(nvl(candidate.getCurrentRole(), "Professional"))
                .experienceYears(candidate.getTotalExperienceYears())
                .careerStage(candidate.getCareerStage())
                .industry(nvl(candidate.getIndustry(), "General"))
                .aboutText(aboutText)
                .experienceText(experienceText)
                .enriched(false)
                .sourceType(mode.getCode())
                .build();
    }

    private LinkedInProfileInput buildFallbackInput(CandidateProfile candidate, LinkedInIngestionMode mode) {
        return LinkedInProfileInput.builder()
                .ingestionMode(mode)
                .linkedinUrl(candidate.getLinkedinUrl())
                .fullName(candidate.getFullName())
                .currentRole(nvl(candidate.getCurrentRole(), "Professional"))
                .experienceYears(candidate.getTotalExperienceYears())
                .careerStage(candidate.getCareerStage())
                .industry(nvl(candidate.getIndustry(), "General"))
                .enriched(false)
                .sourceType(mode.getCode())
                .build();
    }

    /**
     * Returns true only when the candidate has a non-blank LinkedIn URL that also
     * passes profile-URL validation.  A stored URL that fails validation is treated
     * as absent so analysis never uses it as a signal source.
     */
    private boolean hasValidLinkedInUrl(CandidateProfile candidate) {
        String url = candidate.getLinkedinUrl();
        if (!hasContent(url)) return false;
        if (LinkedInUrlValidator.isValidProfileUrl(url)) return true;
        log.warn("[ProfileIngestion] Stored LinkedIn URL failed validation — treating as absent. candidateCode={}",
                candidate.getCandidateCode());
        return false;
    }

    private boolean hasContent(String value) {
        return value != null && !value.isBlank();
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
