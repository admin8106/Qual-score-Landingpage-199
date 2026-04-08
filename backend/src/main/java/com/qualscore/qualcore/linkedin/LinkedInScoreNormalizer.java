package com.qualscore.qualcore.linkedin;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Normalizes 13 LinkedIn dimension scores into a single composite LinkedIn score.
 *
 * All dimension scores are on a 1–10 integer scale.
 * The composite score is returned as a double, rounded to 1 decimal place.
 *
 * ─────────────────────────────────────────────────────────
 * Dimension Weights (must sum to 1.00):
 *   headlineClarity          0.10
 *   roleClarity              0.08
 *   profileCompleteness      0.12
 *   aboutQuality             0.08
 *   experiencePresentation   0.12
 *   proofOfWorkVisibility    0.10
 *   certificationsSignal     0.05
 *   recommendationSignal     0.05
 *   activityVisibility       0.08
 *   careerConsistency        0.08
 *   growthProgression        0.07
 *   differentiationStrength  0.05
 *   recruiterAttractiveness  0.02
 *                            ─────
 *   Total                    1.00
 * ─────────────────────────────────────────────────────────
 *
 * Output range: 1.0 – 10.0 (1 decimal place).
 *
 * The composite score is clamped to this range to guard against
 * rounding edge-cases when dimension scores hit boundary values.
 */
@Component
public class LinkedInScoreNormalizer {

    private static final double W_HEADLINE_CLARITY          = 0.10;
    private static final double W_ROLE_CLARITY              = 0.08;
    private static final double W_PROFILE_COMPLETENESS      = 0.12;
    private static final double W_ABOUT_QUALITY             = 0.08;
    private static final double W_EXPERIENCE_PRESENTATION   = 0.12;
    private static final double W_PROOF_OF_WORK             = 0.10;
    private static final double W_CERTIFICATIONS            = 0.05;
    private static final double W_RECOMMENDATIONS           = 0.05;
    private static final double W_ACTIVITY_VISIBILITY       = 0.08;
    private static final double W_CAREER_CONSISTENCY        = 0.08;
    private static final double W_GROWTH_PROGRESSION        = 0.07;
    private static final double W_DIFFERENTIATION           = 0.05;
    private static final double W_RECRUITER_ATTRACTIVENESS  = 0.02;

    /**
     * Compute the composite LinkedIn score from a fully-populated analysis output.
     *
     * @param output the output object with all 13 dimension scores set
     * @return normalized LinkedIn score in range [1.0, 10.0], rounded to 1 decimal
     */
    public double normalize(LinkedInAnalysisOutput output) {
        double raw =
            (output.getHeadlineClarity()         * W_HEADLINE_CLARITY)
          + (output.getRoleClarity()              * W_ROLE_CLARITY)
          + (output.getProfileCompleteness()      * W_PROFILE_COMPLETENESS)
          + (output.getAboutQuality()             * W_ABOUT_QUALITY)
          + (output.getExperiencePresentation()   * W_EXPERIENCE_PRESENTATION)
          + (output.getProofOfWorkVisibility()    * W_PROOF_OF_WORK)
          + (output.getCertificationsSignal()     * W_CERTIFICATIONS)
          + (output.getRecommendationSignal()     * W_RECOMMENDATIONS)
          + (output.getActivityVisibility()       * W_ACTIVITY_VISIBILITY)
          + (output.getCareerConsistency()        * W_CAREER_CONSISTENCY)
          + (output.getGrowthProgression()        * W_GROWTH_PROGRESSION)
          + (output.getDifferentiationStrength()  * W_DIFFERENTIATION)
          + (output.getRecruiterAttractiveness()  * W_RECRUITER_ATTRACTIVENESS);

        double clamped = Math.max(1.0, Math.min(10.0, raw));
        return BigDecimal.valueOf(clamped)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
