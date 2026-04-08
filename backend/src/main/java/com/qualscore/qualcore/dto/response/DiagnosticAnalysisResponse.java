package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class DiagnosticAnalysisResponse {
    private String candidateCode;
    private Double careerDirectionScore;
    private Double jobSearchBehaviorScore;
    private Double opportunityReadinessScore;
    private Double flexibilityConstraintsScore;
    private Double improvementIntentScore;
    private Double linkedinScore;
    private Double finalEmployabilityScore;
    private String bandLabel;
    private List<String> tags;
    private Map<String, Object> reportSummary;
    private boolean reportGenerated;
    private boolean linkedinAnalyzed;
    private boolean isMockLinkedIn;
    private String analyzedAt;
}
