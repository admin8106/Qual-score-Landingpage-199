package com.qualscore.qualcore.catalog;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SectionScoreResult {
    private String sectionCode;
    private String sectionLabel;
    private List<ScoredAnswer> answers;
    private double averageScore;
}
