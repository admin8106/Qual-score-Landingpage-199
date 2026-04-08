package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.LinkedInAnalysisStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class LinkedInAnalysisResponse {

    private UUID id;
    private String candidateCode;
    private LinkedInAnalysisStatus analysisStatus;
    private Integer profileCompletenessScore;
    private Integer headlineQualityScore;
    private Integer summaryStrengthScore;
    private Integer experienceDepthScore;
    private Integer skillsRelevanceScore;
    private Integer recommendationsCountScore;
    private Integer connectionStrengthScore;
    private Integer activityEngagementScore;
    private Integer keywordOptimizationScore;
    private Integer photoQualityScore;
    private Integer educationPresenceScore;
    private Integer achievementQuantificationScore;
    private Integer personalBrandingScore;
    private List<String> summaryNotes;
    private List<String> topStrengths;
    private List<String> topConcerns;
    private OffsetDateTime analysedAt;
}
