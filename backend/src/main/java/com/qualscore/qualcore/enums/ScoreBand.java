package com.qualscore.qualcore.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ScoreBand {
    CRITICAL("Critical", 0.0, 4.9),
    NEEDS_OPTIMIZATION("Needs Optimization", 5.0, 7.4),
    STRONG("Strong with Improvement Opportunities", 7.5, 10.0);

    private final String label;
    private final double minScore;
    private final double maxScore;

    public static ScoreBand fromScore(double score) {
        if (score <= 4.9) return CRITICAL;
        if (score <= 7.4) return NEEDS_OPTIMIZATION;
        return STRONG;
    }
}
