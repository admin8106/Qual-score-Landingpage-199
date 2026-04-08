package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.catalog.ScoredAnswer;
import com.qualscore.qualcore.service.impl.TaggingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TaggingService")
class TaggingServiceTest {

    private TaggingService taggingService;

    @BeforeEach
    void setUp() {
        taggingService = new TaggingServiceImpl();
    }

    @Nested
    @DisplayName("Final score band tags")
    class FinalScoreBandTags {

        @Test
        @DisplayName("score below 5.0 produces high_pain_lead tag")
        void scoreBelowFive_producesHighPainLeadTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 4.9);
            assertThat(tags).contains("high_pain_lead");
        }

        @Test
        @DisplayName("score between 5.0 and 7.5 produces warm_diagnostic_lead tag")
        void scoreBetweenFiveAndSevenFive_producesWarmDiagnosticLeadTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("warm_diagnostic_lead");
        }

        @Test
        @DisplayName("score of 7.5 and above produces premium_lead tag")
        void scoreAtOrAboveSevenFive_producesPremiumLeadTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 7.5);
            assertThat(tags).contains("premium_lead");
        }

        @Test
        @DisplayName("exactly 5.0 score produces warm_diagnostic_lead not high_pain_lead")
        void exactlyFive_isWarmNotHighPain() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 5.0);
            assertThat(tags).contains("warm_diagnostic_lead").doesNotContain("high_pain_lead");
        }
    }

    @Nested
    @DisplayName("Section-level tags")
    class SectionTags {

        @Test
        @DisplayName("career direction below 5.0 produces career_clarity_low")
        void lowCareerDirection_producesCareerClarityLowTag() {
            DiagnosticScoreResult result = scoreResult(4.9, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("career_clarity_low");
        }

        @Test
        @DisplayName("career direction at 5.0 does not produce career_clarity_low")
        void careerDirectionAtFive_doesNotProduceLowTag() {
            DiagnosticScoreResult result = scoreResult(5.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).doesNotContain("career_clarity_low");
        }

        @Test
        @DisplayName("job search below 5.0 produces job_search_inconsistent")
        void lowJobSearch_producesJobSearchInconsistentTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 4.9, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("job_search_inconsistent");
        }

        @Test
        @DisplayName("readiness below 5.0 produces interview_readiness_low")
        void lowReadiness_producesInterviewReadinessLowTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 4.9, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("interview_readiness_low");
        }

        @Test
        @DisplayName("flexibility below 5.0 produces flexibility_low")
        void lowFlexibility_producesFlexibilityLowTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 4.9, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("flexibility_low");
        }

        @Test
        @DisplayName("intent above 7.0 produces high_intent")
        void highIntent_producesHighIntentTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 7.1, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("high_intent").doesNotContain("warm_lead").doesNotContain("low_action_intent");
        }

        @Test
        @DisplayName("intent between 5.0 and 7.0 produces warm_lead")
        void midIntent_producesWarmLeadTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 6.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("warm_lead").doesNotContain("high_intent").doesNotContain("low_action_intent");
        }

        @Test
        @DisplayName("intent below 5.0 produces low_action_intent")
        void lowIntent_producesLowActionIntentTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 4.9, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("low_action_intent").doesNotContain("high_intent").doesNotContain("warm_lead");
        }
    }

    @Nested
    @DisplayName("Question-level tags")
    class QuestionTags {

        @Test
        @DisplayName("Q08 score 1 produces proof_of_work_low")
        void q08ScoreOne_producesProofOfWorkLow() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q08", "OPPORTUNITY_READINESS", 1)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("proof_of_work_low");
        }

        @Test
        @DisplayName("Q08 score 4 produces proof_of_work_low")
        void q08ScoreFour_producesProofOfWorkLow() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q08", "OPPORTUNITY_READINESS", 4)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("proof_of_work_low");
        }

        @Test
        @DisplayName("Q08 score 7 does not produce proof_of_work_low")
        void q08ScoreSeven_doesNotProduceProofOfWorkLow() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q08", "OPPORTUNITY_READINESS", 7)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).doesNotContain("proof_of_work_low");
        }

        @Test
        @DisplayName("Q12 score 1 produces salary_expectation_risk")
        void q12ScoreOne_producesSalaryExpectationRisk() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q12", "FLEXIBILITY", 1)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("salary_expectation_risk");
        }

        @Test
        @DisplayName("Q15 score 10 produces consultation_priority")
        void q15ScoreTen_producesConsultationPriority() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q15", "IMPROVEMENT_INTENT", 10)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("consultation_priority");
        }

        @Test
        @DisplayName("Q15 score 7 produces nurture_after_report")
        void q15ScoreSeven_producesNurtureAfterReport() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q15", "IMPROVEMENT_INTENT", 7)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("nurture_after_report");
        }

        @Test
        @DisplayName("Q15 score 1 produces low_immediate_conversion")
        void q15ScoreOne_producesLowImmediateConversion() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0,
                List.of(scoredAnswer("Q15", "IMPROVEMENT_INTENT", 1)));
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).contains("low_immediate_conversion");
        }
    }

    @Nested
    @DisplayName("Tag list properties")
    class TagListProperties {

        @Test
        @DisplayName("returned list is immutable")
        void returnedList_isImmutable() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            org.junit.jupiter.api.Assertions.assertThrows(
                UnsupportedOperationException.class,
                () -> tags.add("custom_tag")
            );
        }

        @Test
        @DisplayName("always produces at least one tag")
        void alwaysProducesAtLeastOneTag() {
            DiagnosticScoreResult result = scoreResult(8.0, 8.0, 8.0, 8.0, 8.0, List.of());
            List<String> tags = taggingService.generateTags(result, 6.0);
            assertThat(tags).isNotEmpty();
        }
    }

    private static DiagnosticScoreResult scoreResult(
            double careerDirection, double jobSearch,
            double readiness, double flexibility, double intent,
            List<ScoredAnswer> scoredAnswers) {
        return DiagnosticScoreResult.builder()
                .careerDirectionScore(careerDirection)
                .jobSearchBehaviorScore(jobSearch)
                .opportunityReadinessScore(readiness)
                .flexibilityScore(flexibility)
                .improvementIntentScore(intent)
                .scoredAnswers(scoredAnswers)
                .sectionScores(java.util.Map.of())
                .build();
    }

    private static ScoredAnswer scoredAnswer(String questionCode, String sectionCode, int score) {
        return ScoredAnswer.builder()
                .questionCode(questionCode)
                .sectionCode(sectionCode)
                .selectedOptionCode("test_option")
                .selectedOptionLabel("Test Option")
                .backendScore(score)
                .build();
    }
}
