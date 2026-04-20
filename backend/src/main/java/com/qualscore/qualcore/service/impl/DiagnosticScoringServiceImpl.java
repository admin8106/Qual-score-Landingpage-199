package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.catalog.DiagnosticCatalog;
import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.catalog.QuestionMaster;
import com.qualscore.qualcore.catalog.QuestionOption;
import com.qualscore.qualcore.catalog.ScoredAnswer;
import com.qualscore.qualcore.catalog.SectionScoreResult;
import com.qualscore.qualcore.constants.DiagnosticConstants;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerRequest;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.service.DiagnosticQuestionService;
import com.qualscore.qualcore.service.DiagnosticScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagnosticScoringServiceImpl implements DiagnosticScoringService {

    private final DiagnosticCatalog catalog;
    private final DiagnosticQuestionService questionService;

    @Override
    public DiagnosticScoreResult score(List<DiagnosticAnswerRequest> answers) {
        questionService.validateSubmission(answers);

        List<ScoredAnswer> scoredAnswers = new ArrayList<>();
        Map<String, List<ScoredAnswer>> bySection = new LinkedHashMap<>();

        for (DiagnosticAnswerRequest answer : answers) {
            QuestionMaster question = catalog.findByCode(answer.getQuestionCode())
                    .orElseThrow(() -> new BusinessException(
                            "UNKNOWN_QUESTION",
                            "Question not found in catalog: " + answer.getQuestionCode(),
                            HttpStatus.BAD_REQUEST));

            int backendScore = question.findOption(answer.getSelectedOptionCode())
                    .orElseThrow(() -> new BusinessException(
                            "UNKNOWN_OPTION",
                            "Option '" + answer.getSelectedOptionCode() +
                            "' is not valid for question " + answer.getQuestionCode(),
                            HttpStatus.BAD_REQUEST))
                    .getScore();

            String optionLabel = question.findOption(answer.getSelectedOptionCode())
                    .map(QuestionOption::getLabel)
                    .orElse(answer.getSelectedOptionCode());

            ScoredAnswer scored = ScoredAnswer.builder()
                    .questionCode(answer.getQuestionCode())
                    .sectionCode(question.getSectionCode())
                    .selectedOptionCode(answer.getSelectedOptionCode())
                    .selectedOptionLabel(optionLabel)
                    .backendScore(backendScore)
                    .build();

            scoredAnswers.add(scored);
            bySection.computeIfAbsent(question.getSectionCode(), k -> new ArrayList<>()).add(scored);
        }

        Map<String, SectionScoreResult> sectionScores = buildSectionScores(bySection);

        double careerDirection = roundOne(sectionAverage(sectionScores, DiagnosticConstants.SECTION_CAREER_DIRECTION));
        double jobSearch       = roundOne(sectionAverage(sectionScores, DiagnosticConstants.SECTION_JOB_SEARCH));
        double readiness       = roundOne(sectionAverage(sectionScores, DiagnosticConstants.SECTION_OPPORTUNITY_READINESS));
        double flexibility     = roundOne(sectionAverage(sectionScores, DiagnosticConstants.SECTION_FLEXIBILITY));
        double intent          = roundOne(sectionAverage(sectionScores, DiagnosticConstants.SECTION_IMPROVEMENT_INTENT));

        log.debug("Section scores — CD={}, JS={}, OR={}, FL={}, II={}",
                careerDirection, jobSearch, readiness, flexibility, intent);

        return DiagnosticScoreResult.builder()
                .scoredAnswers(scoredAnswers)
                .sectionScores(sectionScores)
                .careerDirectionScore(careerDirection)
                .jobSearchBehaviorScore(jobSearch)
                .opportunityReadinessScore(readiness)
                .flexibilityScore(flexibility)
                .improvementIntentScore(intent)
                .build();
    }

    private Map<String, SectionScoreResult> buildSectionScores(Map<String, List<ScoredAnswer>> bySection) {
        Map<String, SectionScoreResult> results = new LinkedHashMap<>();
        for (Map.Entry<String, List<ScoredAnswer>> entry : bySection.entrySet()) {
            String sectionCode    = entry.getKey();
            List<ScoredAnswer> sectionAnswers = entry.getValue();

            double avg = sectionAnswers.stream()
                    .mapToInt(ScoredAnswer::getBackendScore)
                    .average()
                    .orElse(0.0);

            String sectionLabel = sectionAnswers.stream()
                    .findFirst()
                    .map(a -> catalog.findByCode(a.getQuestionCode())
                            .map(QuestionMaster::getSectionLabel)
                            .orElse(sectionCode))
                    .orElse(sectionCode);

            results.put(sectionCode, SectionScoreResult.builder()
                    .sectionCode(sectionCode)
                    .sectionLabel(sectionLabel)
                    .answers(sectionAnswers)
                    .averageScore(roundOne(avg))
                    .build());
        }
        return results;
    }

    private double sectionAverage(Map<String, SectionScoreResult> sectionScores, String sectionCode) {
        SectionScoreResult result = sectionScores.get(sectionCode);
        return result != null ? result.getAverageScore() : 0.0;
    }

    private double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
