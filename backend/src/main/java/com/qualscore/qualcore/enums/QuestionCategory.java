package com.qualscore.qualcore.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum QuestionCategory {
    CAREER_DIRECTION("Career Direction", 0.12),
    JOB_SEARCH_BEHAVIOR("Job Search Behavior", 0.12),
    OPPORTUNITY_READINESS("Opportunity Readiness", 0.16),
    FLEXIBILITY_CONSTRAINTS("Flexibility & Constraints", 0.10),
    IMPROVEMENT_INTENT("Improvement Intent", 0.10);

    private final String label;
    private final double weight;
}
