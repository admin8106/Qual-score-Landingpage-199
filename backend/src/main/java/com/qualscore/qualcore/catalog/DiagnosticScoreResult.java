package com.qualscore.qualcore.catalog;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class DiagnosticScoreResult {
    private List<ScoredAnswer> scoredAnswers;
    private Map<String, SectionScoreResult> sectionScores;
    private double careerDirectionScore;
    private double jobSearchBehaviorScore;
    private double opportunityReadinessScore;
    private double flexibilityScore;
    private double improvementIntentScore;
}
