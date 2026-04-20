package com.qualscore.qualcore.dto.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FinalScoreDto {

    private Double linkedInScore;
    private Map<String, Double> sectionScores;
    private Double finalEmployabilityScore;
    private String band;
    private String bandLabel;
    private List<String> tags;
    private LinkedInAnalysisDto linkedInAnalysis;
    private String computedAt;
}
