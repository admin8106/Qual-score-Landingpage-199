package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DiagnosticScoreResponse {

    private UUID id;
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
    private OffsetDateTime calculatedAt;
}
