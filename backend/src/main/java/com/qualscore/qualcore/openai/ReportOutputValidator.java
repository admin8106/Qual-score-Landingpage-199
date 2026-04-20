package com.qualscore.qualcore.openai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Deep structural validator for Prompt B (Report Generator) AI output.
 *
 * ─────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────
 * AiJsonParser validates that the output is parseable JSON and that the
 * 10 required top-level fields are present. This validator goes further:
 * it checks internal structure of nested objects and arrays, enforces
 * type constraints, validates enumerated values, and detects forbidden
 * language in any string field.
 *
 * ─────────────────────────────────────────────────────────
 * VALIDATION LAYERS
 * ─────────────────────────────────────────────────────────
 * 1. Root fields — all 10 required keys present (delegated to AiJsonParser)
 * 2. scoreSummary — object with employabilityScore (number), bandLabel (enum), tagline (string)
 * 3. dimensionBreakdown — array of exactly 6 objects; each has area, score, status, remark
 *    - area must match one of the 6 expected names
 *    - status must be one of the allowed status values
 * 4. topGaps — array of exactly 3 plain strings (no nested objects)
 * 5. ctaBlock — object with headline, body, buttonText
 *    - buttonText must be exactly "Book Detailed Evaluation"
 * 6. Forbidden language scan — any string field containing banned phrases fails validation
 *
 * ─────────────────────────────────────────────────────────
 * TESTABILITY
 * ─────────────────────────────────────────────────────────
 * - {@link ValidationResult} is a pure value object — easy to assert in tests
 * - {@link #validate(Map)} accepts a plain Map<String, Object> — no dependencies
 * - Malformed response simulation: pass a Map with any field missing or wrong type
 * - Fallback path testability: when validate() returns failure, the service falls back
 *
 * ─────────────────────────────────────────────────────────
 * USAGE IN ReportGenerationServiceImpl
 * ─────────────────────────────────────────────────────────
 * After AiJsonParser.parseToMap() returns a present Optional, call:
 *   ValidationResult result = validator.validate(parsed);
 *   if (!result.isValid()) {
 *       log.warn("[ReportGen] Output validation failed: {}", result.getFailureReasons());
 *       // treat as parse failure → retry or fallback
 *   }
 */
@Slf4j
@Component
public class ReportOutputValidator {

    private static final Set<String> VALID_BAND_LABELS = Set.of(
            "CRITICAL", "NEEDS_OPTIMIZATION", "STRONG"
    );

    private static final Set<String> VALID_DIMENSION_STATUSES = Set.of(
            "Strong", "Good", "Moderate", "Needs Attention", "Critical"
    );

    private static final List<String> EXPECTED_DIMENSION_AREAS = List.of(
            "Career Direction",
            "Job Search Behavior",
            "Opportunity Readiness",
            "Flexibility & Constraints",
            "Improvement Intent",
            "LinkedIn Presence"
    );

    private static final int EXPECTED_DIMENSION_COUNT = 6;
    private static final int EXPECTED_TOP_GAPS_COUNT  = 3;
    private static final String REQUIRED_BUTTON_TEXT  = "Book Detailed Evaluation";

    private static final List<String> FORBIDDEN_PHRASES = List.of(
            "guaranteed",
            "will guarantee",
            "guarantee you",
            "will get hired",
            "will get a job",
            "ensure you get hired",
            "will definitely",
            "will certainly",
            "100% success",
            "placement guarantee",
            "job placement",
            "we place",
            "we promise",
            "i promise",
            "we guarantee",
            "ensure a higher salary",
            "better salary guaranteed",
            "higher salary",
            "work hard and succeed",
            "believe in yourself",
            "stay positive and",
            "great career ahead",
            "bright future ahead",
            "dream job"
    );

    /**
     * Validates the deep structure of a parsed AI report output.
     *
     * @param reportData the fully parsed Map from AiJsonParser
     * @return ValidationResult containing success status and all failure reasons
     */
    public ValidationResult validate(Map<String, Object> reportData) {
        List<String> reasons = new ArrayList<>();

        validateScoreSummary(reportData, reasons);
        validateDimensionBreakdown(reportData, reasons);
        validateTopGaps(reportData, reasons);
        validateCtaBlock(reportData, reasons);
        validateStringFields(reportData, reasons);

        if (reasons.isEmpty()) {
            log.debug("[ReportOutputValidator] Validation passed");
            return ValidationResult.success();
        }

        log.warn("[ReportOutputValidator] Validation failed with {} reason(s): {}", reasons.size(), reasons);
        return ValidationResult.failure(reasons);
    }

    private void validateScoreSummary(Map<String, Object> data, List<String> reasons) {
        Object raw = data.get("scoreSummary");
        if (!(raw instanceof Map<?, ?> summary)) {
            reasons.add("scoreSummary: must be an object, got " + typeName(raw));
            return;
        }

        Object score = summary.get("employabilityScore");
        if (score == null) {
            reasons.add("scoreSummary.employabilityScore: missing");
        } else if (!(score instanceof Number)) {
            reasons.add("scoreSummary.employabilityScore: must be a number, got " + typeName(score));
        } else {
            double val = ((Number) score).doubleValue();
            if (val < 0.0 || val > 10.0) {
                reasons.add("scoreSummary.employabilityScore: value " + val + " is out of range [0, 10]");
            }
        }

        Object band = summary.get("bandLabel");
        if (band == null) {
            reasons.add("scoreSummary.bandLabel: missing");
        } else if (!VALID_BAND_LABELS.contains(band.toString())) {
            reasons.add("scoreSummary.bandLabel: invalid value '" + band + "', must be one of " + VALID_BAND_LABELS);
        }

        Object tagline = summary.get("tagline");
        if (tagline == null || tagline.toString().isBlank()) {
            reasons.add("scoreSummary.tagline: missing or blank");
        }
    }

    private void validateDimensionBreakdown(Map<String, Object> data, List<String> reasons) {
        Object raw = data.get("dimensionBreakdown");
        if (!(raw instanceof List<?> list)) {
            reasons.add("dimensionBreakdown: must be an array, got " + typeName(raw));
            return;
        }

        if (list.size() != EXPECTED_DIMENSION_COUNT) {
            reasons.add("dimensionBreakdown: expected exactly " + EXPECTED_DIMENSION_COUNT +
                        " items, got " + list.size());
        }

        for (int i = 0; i < list.size(); i++) {
            Object item = list.get(i);
            if (!(item instanceof Map<?, ?> dim)) {
                reasons.add("dimensionBreakdown[" + i + "]: must be an object");
                continue;
            }

            Object area = dim.get("area");
            if (area == null || area.toString().isBlank()) {
                reasons.add("dimensionBreakdown[" + i + "].area: missing or blank");
            } else if (!EXPECTED_DIMENSION_AREAS.contains(area.toString())) {
                reasons.add("dimensionBreakdown[" + i + "].area: unrecognized value '" + area +
                            "', must be one of " + EXPECTED_DIMENSION_AREAS);
            }

            Object score = dim.get("score");
            if (score == null) {
                reasons.add("dimensionBreakdown[" + i + "].score: missing");
            } else if (!(score instanceof Number)) {
                reasons.add("dimensionBreakdown[" + i + "].score: must be a number, got " + typeName(score));
            } else {
                double val = ((Number) score).doubleValue();
                if (val < 0.0 || val > 10.0) {
                    reasons.add("dimensionBreakdown[" + i + "].score: value " + val + " is out of range [0, 10]");
                }
            }

            Object status = dim.get("status");
            if (status == null || status.toString().isBlank()) {
                reasons.add("dimensionBreakdown[" + i + "].status: missing or blank");
            } else if (!VALID_DIMENSION_STATUSES.contains(status.toString())) {
                reasons.add("dimensionBreakdown[" + i + "].status: invalid value '" + status +
                            "', must be one of " + VALID_DIMENSION_STATUSES);
            }

            Object remark = dim.get("remark");
            if (remark == null || remark.toString().isBlank()) {
                reasons.add("dimensionBreakdown[" + i + "].remark: missing or blank");
            }
        }
    }

    private void validateTopGaps(Map<String, Object> data, List<String> reasons) {
        Object raw = data.get("topGaps");
        if (!(raw instanceof List<?> list)) {
            reasons.add("topGaps: must be an array, got " + typeName(raw));
            return;
        }

        if (list.size() != EXPECTED_TOP_GAPS_COUNT) {
            reasons.add("topGaps: expected exactly " + EXPECTED_TOP_GAPS_COUNT +
                        " items, got " + list.size());
        }

        for (int i = 0; i < list.size(); i++) {
            Object item = list.get(i);
            if (item instanceof Map<?, ?>) {
                reasons.add("topGaps[" + i + "]: must be a plain string, got an object");
            } else if (item == null || item.toString().isBlank()) {
                reasons.add("topGaps[" + i + "]: must be a non-blank string");
            }
        }
    }

    private void validateCtaBlock(Map<String, Object> data, List<String> reasons) {
        Object raw = data.get("ctaBlock");
        if (!(raw instanceof Map<?, ?> cta)) {
            reasons.add("ctaBlock: must be an object, got " + typeName(raw));
            return;
        }

        Object headline = cta.get("headline");
        if (headline == null || headline.toString().isBlank()) {
            reasons.add("ctaBlock.headline: missing or blank");
        }

        Object body = cta.get("body");
        if (body == null || body.toString().isBlank()) {
            reasons.add("ctaBlock.body: missing or blank");
        }

        Object buttonText = cta.get("buttonText");
        if (buttonText == null) {
            reasons.add("ctaBlock.buttonText: missing");
        } else if (!REQUIRED_BUTTON_TEXT.equals(buttonText.toString())) {
            reasons.add("ctaBlock.buttonText: must be exactly '" + REQUIRED_BUTTON_TEXT +
                        "', got '" + buttonText + "'");
        }
    }

    private void validateStringFields(Map<String, Object> data, List<String> reasons) {
        collectAllStrings(data).forEach(text -> {
            String lower = text.toLowerCase();
            for (String phrase : FORBIDDEN_PHRASES) {
                if (lower.contains(phrase.toLowerCase())) {
                    reasons.add("Forbidden phrase detected in output: \"" + phrase + "\"");
                    return;
                }
            }
        });
    }

    private List<String> collectAllStrings(Object node) {
        List<String> collected = new ArrayList<>();
        if (node instanceof String s) {
            collected.add(s);
        } else if (node instanceof Map<?, ?> map) {
            map.values().forEach(v -> collected.addAll(collectAllStrings(v)));
        } else if (node instanceof List<?> list) {
            list.forEach(item -> collected.addAll(collectAllStrings(item)));
        }
        return collected;
    }

    private String typeName(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof Map<?, ?>) return "object";
        if (obj instanceof List<?>) return "array";
        return obj.getClass().getSimpleName();
    }

    /**
     * Value object representing the outcome of a validation pass.
     *
     * Usage in tests:
     * <pre>
     *   ValidationResult result = validator.validate(reportMap);
     *   assertTrue(result.isValid());
     *
     *   ValidationResult failure = validator.validate(badMap);
     *   assertFalse(failure.isValid());
     *   assertTrue(failure.getFailureReasons().contains("ctaBlock.buttonText: ..."));
     * </pre>
     */
    public record ValidationResult(boolean valid, List<String> failureReasons) {

        public static ValidationResult success() {
            return new ValidationResult(true, List.of());
        }

        public static ValidationResult failure(List<String> reasons) {
            return new ValidationResult(false, List.copyOf(reasons));
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getFailureReasons() {
            return failureReasons;
        }
    }
}
