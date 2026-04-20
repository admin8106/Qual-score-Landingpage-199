package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.catalog.ScoredAnswer;
import com.qualscore.qualcore.service.TaggingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class TaggingServiceImpl implements TaggingService {

    @Override
    public List<String> generateTags(DiagnosticScoreResult scoreResult, double finalEmployabilityScore) {
        List<String> tags = new ArrayList<>();

        applySectionTags(tags, scoreResult);
        applyQuestionTags(tags, scoreResult);
        applyFinalScoreTags(tags, finalEmployabilityScore);

        log.debug("Generated {} CRM tags for finalScore={}: {}", tags.size(), finalEmployabilityScore, tags);
        return List.copyOf(tags);
    }

    private void applySectionTags(List<String> tags, DiagnosticScoreResult scoreResult) {
        double careerDirection = scoreResult.getCareerDirectionScore();
        double jobSearch       = scoreResult.getJobSearchBehaviorScore();
        double readiness       = scoreResult.getOpportunityReadinessScore();
        double flexibility     = scoreResult.getFlexibilityScore();
        double intent          = scoreResult.getImprovementIntentScore();

        if (careerDirection < 5.0) tags.add("career_clarity_low");
        if (jobSearch       < 5.0) tags.add("job_search_inconsistent");
        if (readiness       < 5.0) tags.add("interview_readiness_low");
        if (flexibility     < 5.0) tags.add("flexibility_low");

        if (intent > 7.0)       tags.add("high_intent");
        else if (intent >= 5.0) tags.add("warm_lead");
        else                    tags.add("low_action_intent");
    }

    private void applyQuestionTags(List<String> tags, DiagnosticScoreResult scoreResult) {
        Map<String, Integer> scoreByQuestion = scoreResult.getScoredAnswers().stream()
                .collect(Collectors.toMap(
                        ScoredAnswer::getQuestionCode,
                        ScoredAnswer::getBackendScore
                ));

        Integer q8Score  = scoreByQuestion.get("Q08");
        Integer q12Score = scoreByQuestion.get("Q12");
        Integer q15Score = scoreByQuestion.get("Q15");

        if (q8Score != null && (q8Score == 1 || q8Score == 4)) {
            tags.add("proof_of_work_low");
        }

        if (q12Score != null && q12Score == 1) {
            tags.add("salary_expectation_risk");
        }

        if (q15Score != null) {
            if (q15Score == 10)                    tags.add("consultation_priority");
            else if (q15Score == 7)                tags.add("nurture_after_report");
            else if (q15Score == 1 || q15Score == 4) tags.add("low_immediate_conversion");
        }
    }

    private void applyFinalScoreTags(List<String> tags, double finalScore) {
        if (finalScore < 5.0)       tags.add("high_pain_lead");
        else if (finalScore < 7.5)  tags.add("warm_diagnostic_lead");
        else                        tags.add("premium_lead");
    }
}
