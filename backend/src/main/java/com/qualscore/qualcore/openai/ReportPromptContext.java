package com.qualscore.qualcore.openai;

import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Context object carrying all data needed to build Prompt B (Report Generator).
 *
 * Assembled by {@link com.qualscore.qualcore.service.impl.ReportGenerationServiceImpl}
 * from the candidate profile, diagnostic scores, LinkedIn analysis, and tag signals.
 *
 * Kept as a dedicated context object (not raw JPA entities) so the prompt builder
 * is fully testable in isolation and decoupled from persistence concerns.
 */
@Data
@Builder
public class ReportPromptContext {

    private String candidateName;
    private String careerStage;
    private String industry;
    private String currentRole;
    private String experienceYears;
    private String candidateCode;
    private String bandLabel;

    private double finalScore;
    private double careerDirectionScore;
    private double jobSearchScore;
    private double readinessScore;
    private double flexibilityScore;
    private double improvementIntentScore;
    private double linkedinScore;

    private int linkedinHeadlineClarity;
    private int linkedinRoleClarity;
    private int linkedinProfileCompleteness;
    private int linkedinAboutQuality;
    private int linkedinExperiencePresentation;
    private int linkedinProofOfWork;
    private int linkedinCertificationsSignal;
    private int linkedinRecommendationSignal;
    private int linkedinActivityVisibility;
    private int linkedinCareerConsistency;
    private int linkedinGrowthProgression;
    private int linkedinDifferentiationStrength;
    private int linkedinRecruiterAttractiveness;

    private List<String> linkedinTopStrengths;
    private List<String> linkedinTopConcernsList;
    private String linkedinTopConcerns;

    private List<String> diagnosticTags;

    /**
     * LinkedIn ingestion mode used for this analysis.
     * Drives how the AI qualifies LinkedIn-based insights in the report.
     * URL_ONLY = form-data only (LOW confidence). CANDIDATE_TEXT = partial signals.
     * ENRICHED = full profile data. FALLBACK = no data.
     */
    @Builder.Default
    private LinkedInIngestionMode linkedinIngestionMode = LinkedInIngestionMode.URL_ONLY;

    /**
     * Whether the LinkedIn analysis had real profile content available.
     * false = rule-based inference from form data only.
     */
    @Builder.Default
    private boolean linkedinDataAvailable = false;
}
