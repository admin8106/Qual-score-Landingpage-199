package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticCatalog;
import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.constants.DiagnosticConstants;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerRequest;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.service.impl.DiagnosticScoringServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
@DisplayName("DiagnosticScoringService")
class DiagnosticScoringServiceTest {

    private DiagnosticCatalog catalog;

    @Mock
    private DiagnosticQuestionService questionService;

    private DiagnosticScoringService scoringService;

    @BeforeEach
    void setUp() {
        catalog = new DiagnosticCatalog();
        doNothing().when(questionService).validateSubmission(anyList());
        scoringService = new DiagnosticScoringServiceImpl(catalog, questionService);
    }

    private List<DiagnosticAnswerRequest> allHighScoreAnswers() {
        return List.of(
            answer("Q01", "same_role"),
            answer("Q02", "urgent"),
            answer("Q03", "profile_weak"),
            answer("Q04", "15_plus"),
            answer("Q05", "both_channels"),
            answer("Q06", "consistent_followup"),
            answer("Q07", "fully_ready"),
            answer("Q08", "strong_proof"),
            answer("Q09", "very_clearly"),
            answer("Q10", "all_setups"),
            answer("Q11", "yes_relocate"),
            answer("Q12", "realistic"),
            answer("Q13", "profile_positioning"),
            answer("Q14", "very_actively"),
            answer("Q15", "book_eval")
        );
    }

    private List<DiagnosticAnswerRequest> allLowScoreAnswers() {
        return List.of(
            answer("Q01", "exploring"),
            answer("Q02", "passive"),
            answer("Q03", "unsure"),
            answer("Q04", "0_to_2"),
            answer("Q05", "inconsistent"),
            answer("Q06", "nothing"),
            answer("Q07", "not_ready"),
            answer("Q08", "no_proof"),
            answer("Q09", "struggle"),
            answer("Q10", "restricted"),
            answer("Q11", "no_relocate"),
            answer("Q12", "too_high"),
            answer("Q13", "unsure_gap"),
            answer("Q14", "hardly"),
            answer("Q15", "do_nothing")
        );
    }

    @Nested
    @DisplayName("Score calculation")
    class ScoreCalculation {

        @Test
        @DisplayName("all high-score answers produce max section scores")
        void allHighScoreAnswers_produceMaxSectionScores() {
            DiagnosticScoreResult result = scoringService.score(allHighScoreAnswers());

            assertThat(result.getCareerDirectionScore()).isEqualTo(10.0);
            assertThat(result.getJobSearchBehaviorScore()).isEqualTo(10.0);
            assertThat(result.getOpportunityReadinessScore()).isEqualTo(10.0);
            assertThat(result.getFlexibilityScore()).isEqualTo(10.0);
            assertThat(result.getImprovementIntentScore()).isEqualTo(10.0);
        }

        @Test
        @DisplayName("all low-score answers produce minimum section scores")
        void allLowScoreAnswers_produceMinSectionScores() {
            DiagnosticScoreResult result = scoringService.score(allLowScoreAnswers());

            assertThat(result.getCareerDirectionScore()).isEqualTo(1.0);
            assertThat(result.getJobSearchBehaviorScore()).isEqualTo(1.0);
            assertThat(result.getOpportunityReadinessScore()).isEqualTo(1.0);
            assertThat(result.getFlexibilityScore()).isEqualTo(1.0);
            assertThat(result.getImprovementIntentScore()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("scored answers list has same count as input answers")
        void scoredAnswers_countMatchesInput() {
            DiagnosticScoreResult result = scoringService.score(allHighScoreAnswers());

            assertThat(result.getScoredAnswers()).hasSize(15);
        }

        @Test
        @DisplayName("section scores map contains expected section codes")
        void sectionScores_containExpectedSections() {
            DiagnosticScoreResult result = scoringService.score(allHighScoreAnswers());

            assertThat(result.getSectionScores()).containsKeys(
                DiagnosticConstants.SECTION_CAREER_DIRECTION,
                DiagnosticConstants.SECTION_JOB_SEARCH,
                DiagnosticConstants.SECTION_OPPORTUNITY_READINESS,
                DiagnosticConstants.SECTION_FLEXIBILITY,
                DiagnosticConstants.SECTION_IMPROVEMENT_INTENT
            );
        }

        @Test
        @DisplayName("mixed answers produce intermediate section score")
        void mixedAnswers_produceIntermediateSectionScore() {
            List<DiagnosticAnswerRequest> mixed = List.of(
                answer("Q01", "same_role"),
                answer("Q02", "growth"),
                answer("Q03", "unsure"),
                answer("Q04", "15_plus"),
                answer("Q05", "both_channels"),
                answer("Q06", "consistent_followup"),
                answer("Q07", "fully_ready"),
                answer("Q08", "strong_proof"),
                answer("Q09", "very_clearly"),
                answer("Q10", "all_setups"),
                answer("Q11", "yes_relocate"),
                answer("Q12", "realistic"),
                answer("Q13", "profile_positioning"),
                answer("Q14", "very_actively"),
                answer("Q15", "book_eval")
            );

            DiagnosticScoreResult result = scoringService.score(mixed);

            assertThat(result.getCareerDirectionScore())
                .isGreaterThan(1.0)
                .isLessThan(10.0);
        }

        @Test
        @DisplayName("each scored answer carries its section code")
        void scoredAnswer_carriessectionCode() {
            DiagnosticScoreResult result = scoringService.score(allHighScoreAnswers());

            result.getScoredAnswers().forEach(answer ->
                assertThat(answer.getSectionCode()).isNotBlank()
            );
        }

        @Test
        @DisplayName("score is rounded to one decimal place")
        void score_isRoundedToOneDecimal() {
            List<DiagnosticAnswerRequest> mixedQ1Section = List.of(
                answer("Q01", "same_role"),
                answer("Q02", "urgent"),
                answer("Q03", "low_visibility"),
                answer("Q04", "15_plus"),
                answer("Q05", "both_channels"),
                answer("Q06", "consistent_followup"),
                answer("Q07", "fully_ready"),
                answer("Q08", "strong_proof"),
                answer("Q09", "very_clearly"),
                answer("Q10", "all_setups"),
                answer("Q11", "yes_relocate"),
                answer("Q12", "realistic"),
                answer("Q13", "profile_positioning"),
                answer("Q14", "very_actively"),
                answer("Q15", "book_eval")
            );

            DiagnosticScoreResult result = scoringService.score(mixedQ1Section);

            String scoreStr = Double.toString(result.getCareerDirectionScore());
            int decimalPlaces = scoreStr.contains(".") ? scoreStr.split("\\.")[1].length() : 0;
            assertThat(decimalPlaces).isLessThanOrEqualTo(1);
        }
    }

    @Nested
    @DisplayName("Validation")
    class Validation {

        @Test
        @DisplayName("unknown question code throws BusinessException")
        void unknownQuestionCode_throwsBusinessException() {
            List<DiagnosticAnswerRequest> answers = List.of(answer("Q99", "some_option"));

            assertThatThrownBy(() -> scoringService.score(answers))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Q99");
        }

        @Test
        @DisplayName("unknown option code for known question throws BusinessException")
        void unknownOptionCode_throwsBusinessException() {
            List<DiagnosticAnswerRequest> answers = List.of(answer("Q01", "not_an_option"));

            assertThatThrownBy(() -> scoringService.score(answers))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not_an_option");
        }

        @Test
        @DisplayName("validation failure from questionService propagates")
        void questionServiceValidationFailure_propagates() {
            doThrow(new BusinessException("INCOMPLETE", "Missing questions", org.springframework.http.HttpStatus.BAD_REQUEST))
                .when(questionService).validateSubmission(anyList());

            assertThatThrownBy(() -> scoringService.score(allHighScoreAnswers()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Missing questions");
        }
    }

    private static DiagnosticAnswerRequest answer(String questionCode, String optionCode) {
        DiagnosticAnswerRequest req = new DiagnosticAnswerRequest();
        req.setQuestionCode(questionCode);
        req.setSelectedOptionCode(optionCode);
        return req;
    }
}
