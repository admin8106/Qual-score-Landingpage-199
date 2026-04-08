package com.qualscore.qualcore.linkedin;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Rule-based LinkedIn analysis client.
 *
 * This is the default (and currently {@code @Primary}) implementation of
 * {@link LinkedInAnalysisClient}. It produces a structured analysis using
 * deterministic rules derived from the candidate's form-submitted data:
 *   - linkedinUrl
 *   - currentRole
 *   - experienceYears
 *   - careerStage
 *   - industry
 *   - optional enrichment signals (connectionCount, certificationCount, etc.)
 *
 * ─────────────────────────────────────────────────────────
 * Design Intent:
 *   This client is intentionally structured to mirror the shape of output
 *   that future AI-based clients (Prompt A) and enrichment-based clients
 *   will produce. All scoring rules here should be readable as "if we had
 *   real data, this is what the analysis would look like".
 *
 * When to replace this client:
 *   - Replace with {@code EnrichmentApiLinkedInClient} when Proxycurl or
 *     equivalent is configured and consented.
 *   - Replace with {@code AiPromptLinkedInClient} (Prompt A) when OpenAI
 *     function-calling integration is ready.
 *   - Both replacements only require changing the {@code @Primary} annotation
 *     — no service layer changes needed.
 * ─────────────────────────────────────────────────────────
 *
 * Scoring Philosophy:
 *   - Freshers are scored with lower baseline expectations (calibrated to their stage)
 *   - Working professionals are scored against recruiter-facing standards
 *   - Enriched inputs (real connection count, certifications, etc.) shift scores upward
 *   - All dimension scores stay in [1, 10] range
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class RuleBasedLinkedInAnalysisClient implements LinkedInAnalysisClient {

    private static final String SOURCE_TYPE = "RULE_BASED";

    private final LinkedInScoreNormalizer normalizer;

    @Override
    public String getSourceType() {
        return SOURCE_TYPE;
    }

    @Override
    public LinkedInAnalysisOutput analyze(LinkedInProfileInput input) {
        LinkedInIngestionMode mode = input.getIngestionMode() != null
                ? input.getIngestionMode()
                : LinkedInIngestionMode.URL_ONLY;

        log.info("Rule-based LinkedIn analysis: mode={}, role={}, stage={}, industry={}, hasAboutText={}",
                mode, input.getCurrentRole(), input.getCareerStage(), input.getIndustry(),
                input.getAboutText() != null && !input.getAboutText().isBlank());

        boolean isFresher = CareerStage.FRESHER.equals(input.getCareerStage());
        int experienceYears = parseExperienceYears(input.getExperienceYears());

        int headlineClarity         = scoreHeadlineClarity(input, isFresher);
        int roleClarity             = scoreRoleClarity(input, isFresher);
        int profileCompleteness     = scoreProfileCompleteness(input, isFresher);
        int aboutQuality            = scoreAboutQuality(input, isFresher);
        int experiencePresentation  = scoreExperiencePresentation(experienceYears, isFresher, input.getExperienceEntryCount(), input.getExperienceText());
        int proofOfWorkVisibility   = scoreProofOfWork(input, isFresher);
        int certificationsSignal    = scoreCertifications(input, isFresher);
        int recommendationSignal    = scoreRecommendations(input, isFresher);
        int activityVisibility      = scoreActivityVisibility(input);
        int careerConsistency       = scoreCareerConsistency(experienceYears, isFresher);
        int growthProgression       = scoreGrowthProgression(experienceYears, isFresher);
        int differentiationStrength = scoreDifferentiation(input, isFresher);
        int recruiterAttractiveness = scoreRecruiterAttractiveness(input, isFresher);

        List<String> summaryNotes = buildSummaryNotes(input, isFresher, profileCompleteness, activityVisibility);
        List<String> topStrengths = buildTopStrengths(input, isFresher, experienceYears,
                careerConsistency, profileCompleteness, certificationsSignal);
        List<String> topConcerns  = buildTopConcerns(input, isFresher,
                proofOfWorkVisibility, activityVisibility, aboutQuality, recommendationSignal);

        LinkedInAnalysisOutput output = LinkedInAnalysisOutput.builder()
                .headlineClarity(headlineClarity)
                .roleClarity(roleClarity)
                .profileCompleteness(profileCompleteness)
                .aboutQuality(aboutQuality)
                .experiencePresentation(experiencePresentation)
                .proofOfWorkVisibility(proofOfWorkVisibility)
                .certificationsSignal(certificationsSignal)
                .recommendationSignal(recommendationSignal)
                .activityVisibility(activityVisibility)
                .careerConsistency(careerConsistency)
                .growthProgression(growthProgression)
                .differentiationStrength(differentiationStrength)
                .recruiterAttractiveness(recruiterAttractiveness)
                .summaryNotes(summaryNotes)
                .topStrengths(topStrengths)
                .topConcerns(topConcerns)
                .sourceType(mode.getCode())
                .ingestionMode(mode)
                .analysisConfidence(mode.getDefaultConfidence())
                .analysisCoverage(mode.getDefaultCoverage())
                .mock(mode != LinkedInIngestionMode.ENRICHED)
                .build();

        double score = normalizer.normalize(output);
        output.setLinkedinScore(score);

        log.info("Rule-based LinkedIn score computed: score={}, mode={}, confidence={}",
                score, mode, mode.getDefaultConfidence());
        return output;
    }

    private int scoreHeadlineClarity(LinkedInProfileInput input, boolean isFresher) {
        if (Boolean.TRUE.equals(input.getHasCustomHeadline())) return isFresher ? 6 : 7;
        if (input.getCurrentRole() != null && !input.getCurrentRole().isBlank()) return isFresher ? 5 : 6;
        return isFresher ? 4 : 4;
    }

    private int scoreRoleClarity(LinkedInProfileInput input, boolean isFresher) {
        if (input.getCurrentRole() != null && input.getCurrentRole().length() > 5) return isFresher ? 6 : 7;
        return isFresher ? 4 : 5;
    }

    private int scoreProfileCompleteness(LinkedInProfileInput input, boolean isFresher) {
        int score = 4;
        if (input.getLinkedinUrl() != null && !input.getLinkedinUrl().isBlank()) score += 1;
        if (input.getCurrentRole() != null && !input.getCurrentRole().isBlank()) score += 1;
        if (input.getAboutText() != null && input.getAboutText().length() > 100) score += 1;
        if (input.getExperienceEntryCount() != null && input.getExperienceEntryCount() >= 2) score += 1;
        if (isFresher) score = Math.max(score - 1, 3);
        return clamp(score);
    }

    private int scoreAboutQuality(LinkedInProfileInput input, boolean isFresher) {
        if (input.getAboutText() == null || input.getAboutText().isBlank()) return isFresher ? 3 : 3;
        int len = input.getAboutText().length();
        if (len > 500) return isFresher ? 7 : 8;
        if (len > 200) return isFresher ? 6 : 7;
        if (len > 50)  return isFresher ? 5 : 5;
        return 4;
    }

    private int scoreExperiencePresentation(int years, boolean isFresher, Integer entryCount, String experienceText) {
        int base;
        if (isFresher) {
            base = (entryCount != null && entryCount >= 2) ? 5 : 3;
        } else if (years >= 8) {
            base = (entryCount != null && entryCount >= 3) ? 8 : 7;
        } else if (years >= 4) {
            base = (entryCount != null && entryCount >= 2) ? 7 : 6;
        } else if (years >= 1) {
            base = 5;
        } else {
            base = 4;
        }
        if (hasContent(experienceText) && experienceText.length() > 200) {
            base = clamp(base + 1);
        }
        return base;
    }

    private int scoreProofOfWork(LinkedInProfileInput input, boolean isFresher) {
        int base;
        if (isFresher) {
            base = 3;
        } else {
            int years = parseExperienceYears(input.getExperienceYears());
            base = years >= 5 ? 5 : years >= 2 ? 4 : 3;
        }
        if (hasContent(input.getExperienceText()) && input.getExperienceText().length() > 300) {
            base = clamp(base + 1);
        }
        return base;
    }

    private int scoreCertifications(LinkedInProfileInput input, boolean isFresher) {
        if (input.getCertificationCount() != null) {
            int count = input.getCertificationCount();
            if (count >= 3) return isFresher ? 8 : 7;
            if (count == 2) return isFresher ? 7 : 6;
            if (count == 1) return isFresher ? 6 : 5;
        }
        return isFresher ? 4 : 3;
    }

    private int scoreRecommendations(LinkedInProfileInput input, boolean isFresher) {
        if (input.getRecommendationCount() != null) {
            int count = input.getRecommendationCount();
            if (count >= 3) return isFresher ? 8 : 9;
            if (count >= 1) return isFresher ? 6 : 7;
        }
        return isFresher ? 3 : 3;
    }

    private int scoreActivityVisibility(LinkedInProfileInput input) {
        if (input.getConnectionCount() != null) {
            int connections = input.getConnectionCount();
            if (connections >= 500) return 8;
            if (connections >= 200) return 6;
            if (connections >= 50)  return 5;
        }
        return 4;
    }

    private int scoreCareerConsistency(int years, boolean isFresher) {
        if (isFresher) return 5;
        if (years >= 6) return 8;
        if (years >= 3) return 7;
        if (years >= 1) return 6;
        return 5;
    }

    private int scoreGrowthProgression(int years, boolean isFresher) {
        if (isFresher) return 4;
        if (years >= 8) return 8;
        if (years >= 4) return 7;
        if (years >= 2) return 5;
        return 4;
    }

    private int scoreDifferentiation(LinkedInProfileInput input, boolean isFresher) {
        int base = isFresher ? 3 : 4;
        if (input.getAboutText() != null && input.getAboutText().length() > 300) base += 1;
        if (Boolean.TRUE.equals(input.getHasCustomHeadline())) base += 1;
        return clamp(base);
    }

    private int scoreRecruiterAttractiveness(LinkedInProfileInput input, boolean isFresher) {
        int base = isFresher ? 4 : 5;
        if (input.getConnectionCount() != null && input.getConnectionCount() >= 200) base += 1;
        if (input.getCurrentRole() != null && !input.getCurrentRole().isBlank()) base += 1;
        return clamp(base);
    }

    private List<String> buildSummaryNotes(LinkedInProfileInput input, boolean isFresher,
                                            int profileCompleteness, int activityVisibility) {
        List<String> notes = new ArrayList<>();
        if (profileCompleteness < 6) {
            notes.add("Profile completeness is below the threshold that most recruiters expect.");
        }
        if (activityVisibility < 5) {
            notes.add("Low activity signal — the profile lacks recent engagement or content.");
        }
        if (isFresher) {
            notes.add("As a fresher, certifications and project work are critical profile differentiators.");
        } else if (input.getAboutText() == null || input.getAboutText().isBlank()) {
            notes.add("The About section is missing — this is one of the most-read sections by recruiters.");
        }
        return notes.subList(0, Math.min(notes.size(), 3));
    }

    private List<String> buildTopStrengths(LinkedInProfileInput input, boolean isFresher,
                                            int years, int careerConsistency,
                                            int profileCompleteness, int certifications) {
        List<String> strengths = new ArrayList<>();
        if (input.getCurrentRole() != null && !input.getCurrentRole().isBlank()) {
            strengths.add("Current role is clearly stated, improving role-based search discoverability.");
        }
        if (!isFresher && years >= 3) {
            strengths.add("Work experience length is above average — increases recruiter trust.");
        }
        if (careerConsistency >= 7) {
            strengths.add("Career progression shows consistency and logical role transitions.");
        }
        if (profileCompleteness >= 7) {
            strengths.add("Profile completeness is strong — fewer recruiter drop-offs expected.");
        }
        if (certifications >= 6) {
            strengths.add("Certifications signal continuous learning — a positive recruiter indicator.");
        }
        if (strengths.isEmpty()) {
            strengths.add("LinkedIn profile URL is present — basic discoverability is enabled.");
        }
        return strengths.subList(0, Math.min(strengths.size(), 3));
    }

    private List<String> buildTopConcerns(LinkedInProfileInput input, boolean isFresher,
                                           int proofOfWork, int activityVisibility,
                                           int aboutQuality, int recommendations) {
        List<String> concerns = new ArrayList<>();
        if (proofOfWork <= 4) {
            concerns.add("No visible proof of work — add portfolio links, projects, or publications.");
        }
        if (activityVisibility <= 4) {
            concerns.add("Low LinkedIn activity — recruiters may perceive the profile as inactive.");
        }
        if (aboutQuality <= 3) {
            concerns.add("About section is missing or too short — this is prime real estate for storytelling.");
        }
        if (recommendations <= 3 && !isFresher) {
            concerns.add("No LinkedIn recommendations visible — peer validation is a trust signal for recruiters.");
        }
        if (concerns.isEmpty()) {
            concerns.add("Profile appears complete at a surface level — deeper optimization can improve conversion.");
        }
        return concerns.subList(0, Math.min(concerns.size(), 3));
    }

    private int parseExperienceYears(String experienceYears) {
        if (experienceYears == null || experienceYears.isBlank()) return 0;
        try {
            String cleaned = experienceYears.replaceAll("[^0-9]", "").trim();
            return cleaned.isEmpty() ? 0 : Integer.parseInt(cleaned);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private int clamp(int value) {
        return Math.max(1, Math.min(10, value));
    }

    private boolean hasContent(String value) {
        return value != null && !value.isBlank();
    }
}
