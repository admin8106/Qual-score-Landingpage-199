package com.qualscore.qualcore.constants;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class DiagnosticConstants {

    private DiagnosticConstants() {}

    public static final Set<String> VALID_QUESTION_CODES = Set.of(
            "Q01", "Q02", "Q03", "Q04", "Q05",
            "Q06", "Q07", "Q08", "Q09", "Q10",
            "Q11", "Q12", "Q13", "Q14", "Q15"
    );

    public static final int TOTAL_QUESTIONS = 15;

    public static final String SECTION_CAREER_DIRECTION      = "CAREER_DIRECTION";
    public static final String SECTION_JOB_SEARCH            = "JOB_SEARCH";
    public static final String SECTION_OPPORTUNITY_READINESS = "OPPORTUNITY_READINESS";
    public static final String SECTION_FLEXIBILITY           = "FLEXIBILITY";
    public static final String SECTION_IMPROVEMENT_INTENT   = "IMPROVEMENT_INTENT";

    public static final Map<String, String> QUESTION_SECTION_MAP = Map.ofEntries(
            Map.entry("Q01", SECTION_CAREER_DIRECTION),
            Map.entry("Q02", SECTION_CAREER_DIRECTION),
            Map.entry("Q03", SECTION_CAREER_DIRECTION),
            Map.entry("Q04", SECTION_JOB_SEARCH),
            Map.entry("Q05", SECTION_JOB_SEARCH),
            Map.entry("Q06", SECTION_JOB_SEARCH),
            Map.entry("Q07", SECTION_OPPORTUNITY_READINESS),
            Map.entry("Q08", SECTION_OPPORTUNITY_READINESS),
            Map.entry("Q09", SECTION_OPPORTUNITY_READINESS),
            Map.entry("Q10", SECTION_FLEXIBILITY),
            Map.entry("Q11", SECTION_FLEXIBILITY),
            Map.entry("Q12", SECTION_FLEXIBILITY),
            Map.entry("Q13", SECTION_IMPROVEMENT_INTENT),
            Map.entry("Q14", SECTION_IMPROVEMENT_INTENT),
            Map.entry("Q15", SECTION_IMPROVEMENT_INTENT)
    );

    public static final Map<String, List<String>> SECTION_QUESTIONS = Map.of(
            SECTION_CAREER_DIRECTION,      List.of("Q01", "Q02", "Q03"),
            SECTION_JOB_SEARCH,            List.of("Q04", "Q05", "Q06"),
            SECTION_OPPORTUNITY_READINESS, List.of("Q07", "Q08", "Q09"),
            SECTION_FLEXIBILITY,           List.of("Q10", "Q11", "Q12"),
            SECTION_IMPROVEMENT_INTENT,    List.of("Q13", "Q14", "Q15")
    );

    public static final String BAND_CRITICAL           = "CRITICAL";
    public static final String BAND_NEEDS_OPTIMIZATION = "NEEDS_OPTIMIZATION";
    public static final String BAND_STRONG             = "STRONG";

    public static final double BAND_CRITICAL_MAX           = 4.9;
    public static final double BAND_NEEDS_OPTIMIZATION_MIN = 5.0;
    public static final double BAND_NEEDS_OPTIMIZATION_MAX = 7.4;
    public static final double BAND_STRONG_MIN             = 7.5;

    public static final double WEIGHT_LINKEDIN          = 0.40;
    public static final double WEIGHT_CAREER_DIRECTION  = 0.12;
    public static final double WEIGHT_JOB_SEARCH        = 0.12;
    public static final double WEIGHT_READINESS         = 0.16;
    public static final double WEIGHT_FLEXIBILITY       = 0.10;
    public static final double WEIGHT_INTENT            = 0.10;

    public static final int SCORE_MIN = 1;
    public static final int SCORE_MAX = 10;

    public static String resolveBand(double finalScore) {
        if (finalScore <= BAND_CRITICAL_MAX) return BAND_CRITICAL;
        if (finalScore <= BAND_NEEDS_OPTIMIZATION_MAX) return BAND_NEEDS_OPTIMIZATION;
        return BAND_STRONG;
    }
}
