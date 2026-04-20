package com.qualscore.qualcore.util;

import com.qualscore.qualcore.dto.request.DiagnosticAnswerDto;
import com.qualscore.qualcore.dto.request.FinalScoreDto;
import com.qualscore.qualcore.dto.request.LinkedInAnalysisDto;
import com.qualscore.qualcore.enums.QuestionCategory;
import com.qualscore.qualcore.enums.ScoreBand;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Slf4j
@Component
public class ScoringEngine {

    private static final double LINKEDIN_WEIGHT = 0.40;
    private static final double CAREER_DIRECTION_WEIGHT = 0.12;
    private static final double JOB_SEARCH_WEIGHT = 0.12;
    private static final double OPPORTUNITY_READINESS_WEIGHT = 0.16;
    private static final double FLEXIBILITY_WEIGHT = 0.10;
    private static final double IMPROVEMENT_INTENT_WEIGHT = 0.10;

    private static final Map<Integer, String> QUESTION_CATEGORY_MAP = Map.ofEntries(
            Map.entry(1, QuestionCategory.CAREER_DIRECTION.name()),
            Map.entry(2, QuestionCategory.CAREER_DIRECTION.name()),
            Map.entry(3, QuestionCategory.CAREER_DIRECTION.name()),
            Map.entry(4, QuestionCategory.JOB_SEARCH_BEHAVIOR.name()),
            Map.entry(5, QuestionCategory.JOB_SEARCH_BEHAVIOR.name()),
            Map.entry(6, QuestionCategory.JOB_SEARCH_BEHAVIOR.name()),
            Map.entry(7, QuestionCategory.OPPORTUNITY_READINESS.name()),
            Map.entry(8, QuestionCategory.OPPORTUNITY_READINESS.name()),
            Map.entry(9, QuestionCategory.OPPORTUNITY_READINESS.name()),
            Map.entry(10, QuestionCategory.FLEXIBILITY_CONSTRAINTS.name()),
            Map.entry(11, QuestionCategory.FLEXIBILITY_CONSTRAINTS.name()),
            Map.entry(12, QuestionCategory.FLEXIBILITY_CONSTRAINTS.name()),
            Map.entry(13, QuestionCategory.IMPROVEMENT_INTENT.name()),
            Map.entry(14, QuestionCategory.IMPROVEMENT_INTENT.name()),
            Map.entry(15, QuestionCategory.IMPROVEMENT_INTENT.name())
    );

    public FinalScoreDto calculate(List<DiagnosticAnswerDto> answers, LinkedInAnalysisDto linkedInAnalysis) {
        Map<String, List<Integer>> categoryScoreMap = buildCategoryScoreMap(answers);
        Map<String, Double> sectionScores = computeSectionAverages(categoryScoreMap);

        double linkedInScore = linkedInAnalysis != null && linkedInAnalysis.getScore() != null
                ? linkedInAnalysis.getScore()
                : 5.0;

        double finalScore = (linkedInScore * LINKEDIN_WEIGHT)
                + (sectionScores.getOrDefault(QuestionCategory.CAREER_DIRECTION.name(), 5.0) * CAREER_DIRECTION_WEIGHT)
                + (sectionScores.getOrDefault(QuestionCategory.JOB_SEARCH_BEHAVIOR.name(), 5.0) * JOB_SEARCH_WEIGHT)
                + (sectionScores.getOrDefault(QuestionCategory.OPPORTUNITY_READINESS.name(), 5.0) * OPPORTUNITY_READINESS_WEIGHT)
                + (sectionScores.getOrDefault(QuestionCategory.FLEXIBILITY_CONSTRAINTS.name(), 5.0) * FLEXIBILITY_WEIGHT)
                + (sectionScores.getOrDefault(QuestionCategory.IMPROVEMENT_INTENT.name(), 5.0) * IMPROVEMENT_INTENT_WEIGHT);

        finalScore = Math.round(finalScore * 10.0) / 10.0;
        ScoreBand band = ScoreBand.fromScore(finalScore);
        List<String> tags = generateCrmTags(sectionScores, answers, finalScore);

        FinalScoreDto result = new FinalScoreDto();
        result.setLinkedInScore(linkedInScore);
        result.setSectionScores(sectionScores);
        result.setFinalEmployabilityScore(finalScore);
        result.setBand(band.name());
        result.setBandLabel(band.getLabel());
        result.setTags(tags);
        result.setLinkedInAnalysis(linkedInAnalysis);
        result.setComputedAt(Instant.now().toString());

        log.info("Scoring computed: finalScore={}, band={}, tags={}", finalScore, band, tags);
        return result;
    }

    private Map<String, List<Integer>> buildCategoryScoreMap(List<DiagnosticAnswerDto> answers) {
        Map<String, List<Integer>> map = new HashMap<>();
        for (DiagnosticAnswerDto answer : answers) {
            String cat = QUESTION_CATEGORY_MAP.getOrDefault(answer.getQuestionId(), answer.getCategory());
            map.computeIfAbsent(cat, k -> new ArrayList<>()).add(answer.getScore());
        }
        return map;
    }

    private Map<String, Double> computeSectionAverages(Map<String, List<Integer>> categoryScoreMap) {
        Map<String, Double> averages = new HashMap<>();
        for (Map.Entry<String, List<Integer>> entry : categoryScoreMap.entrySet()) {
            double avg = entry.getValue().stream()
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(5.0);
            averages.put(entry.getKey(), Math.round(avg * 10.0) / 10.0);
        }
        return averages;
    }

    private List<String> generateCrmTags(Map<String, Double> sectionScores,
                                          List<DiagnosticAnswerDto> answers,
                                          double finalScore) {
        List<String> tags = new ArrayList<>();

        double careerDirection = sectionScores.getOrDefault(QuestionCategory.CAREER_DIRECTION.name(), 5.0);
        double jobSearch = sectionScores.getOrDefault(QuestionCategory.JOB_SEARCH_BEHAVIOR.name(), 5.0);
        double readiness = sectionScores.getOrDefault(QuestionCategory.OPPORTUNITY_READINESS.name(), 5.0);
        double flexibility = sectionScores.getOrDefault(QuestionCategory.FLEXIBILITY_CONSTRAINTS.name(), 5.0);
        double intent = sectionScores.getOrDefault(QuestionCategory.IMPROVEMENT_INTENT.name(), 5.0);

        if (careerDirection < 5.0) tags.add("career_clarity_low");
        if (jobSearch < 5.0) tags.add("job_search_inconsistent");
        if (readiness < 5.0) tags.add("interview_readiness_low");
        if (flexibility < 5.0) tags.add("flexibility_low");

        if (intent > 7.0) tags.add("high_intent");
        else if (intent >= 5.0) tags.add("warm_lead");
        else tags.add("low_action_intent");

        answers.stream()
                .filter(a -> a.getQuestionId() == 8 && (a.getScore() == 1 || a.getScore() == 4))
                .findFirst()
                .ifPresent(a -> tags.add("proof_of_work_low"));

        answers.stream()
                .filter(a -> a.getQuestionId() == 12 && a.getScore() == 1)
                .findFirst()
                .ifPresent(a -> tags.add("salary_expectation_risk"));

        answers.stream()
                .filter(a -> a.getQuestionId() == 15)
                .findFirst()
                .ifPresent(a -> {
                    if (a.getScore() == 10)                         tags.add("consultation_priority");
                    else if (a.getScore() == 7)                    tags.add("nurture_after_report");
                    else if (a.getScore() == 1 || a.getScore() == 4) tags.add("low_immediate_conversion");
                });

        if (finalScore < 5.0) tags.add("high_pain_lead");
        else if (finalScore < 7.5) tags.add("warm_diagnostic_lead");
        else tags.add("premium_lead");

        return tags;
    }
}
