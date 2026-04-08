package com.qualscore.qualcore.dto.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class LinkedInAnalysisDto {

    private Double score;
    private String headline;
    private Double completeness;
    private String activityLevel;
    private String connectionStrength;
    private Double keywordOptimization;
    private Map<String, Object> profileAnalysis;
    private boolean isMock;
}
