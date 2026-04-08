package com.qualscore.qualcore.openai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Strict JSON parser and validator for AI-generated responses.
 *
 * Purpose:
 *   OpenAI responses — even with response_format: json_object — can occasionally
 *   include markdown code fences, leading prose, or trailing text. This component
 *   extracts and validates clean JSON from raw AI output.
 *
 * ─────────────────────────────────────────────────────────
 * Parsing Pipeline:
 *   1. Attempt direct parse of raw content
 *   2. If that fails, attempt JSON extraction from markdown fences (```json ... ```)
 *   3. If that fails, attempt extraction of first JSON object via regex
 *   4. If all fail → return empty Optional (triggers retry in service layer)
 * ─────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────
 * Required Fields Validation:
 *   Callers can supply a list of required top-level field names.
 *   If any required field is absent, parsing is considered failed
 *   and triggers a retry (up to maxRetries configured in OpenAiConfig).
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiJsonParser {

    private static final Pattern MARKDOWN_FENCE_PATTERN =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", Pattern.CASE_INSENSITIVE);

    private static final Pattern JSON_OBJECT_PATTERN =
            Pattern.compile("\\{[\\s\\S]*}", Pattern.DOTALL);

    private final ObjectMapper objectMapper;

    /**
     * Parse raw AI content into a Map, with no required field validation.
     *
     * @param rawContent raw string from the AI response
     * @return Optional containing the parsed map, or empty if parsing failed
     */
    public Optional<Map<String, Object>> parseToMap(String rawContent) {
        return parseToMap(rawContent, List.of());
    }

    /**
     * Parse raw AI content into a Map and validate required fields are present.
     *
     * @param rawContent     raw string from the AI response
     * @param requiredFields list of top-level field names that must be present
     * @return Optional containing the parsed map, or empty if parsing or validation failed
     */
    public Optional<Map<String, Object>> parseToMap(String rawContent, List<String> requiredFields) {
        if (rawContent == null || rawContent.isBlank()) {
            log.warn("[AiJsonParser] Raw content is null or blank — cannot parse");
            return Optional.empty();
        }

        String extracted = extractJson(rawContent);
        if (extracted == null) {
            log.warn("[AiJsonParser] Could not extract JSON from AI response (length={})", rawContent.length());
            return Optional.empty();
        }

        try {
            Map<String, Object> result = objectMapper.readValue(extracted, new TypeReference<>() {});

            List<String> missing = requiredFields.stream()
                    .filter(f -> !result.containsKey(f))
                    .toList();

            if (!missing.isEmpty()) {
                log.warn("[AiJsonParser] Required fields missing from AI response: {}", missing);
                return Optional.empty();
            }

            log.debug("[AiJsonParser] Successfully parsed AI JSON with {} top-level fields", result.size());
            return Optional.of(result);

        } catch (JsonProcessingException e) {
            log.warn("[AiJsonParser] JSON parse error: {} (extracted={}...)",
                    e.getOriginalMessage(),
                    extracted.length() > 100 ? extracted.substring(0, 100) : extracted);
            return Optional.empty();
        }
    }

    /**
     * Parse raw AI content into a typed object using a Jackson TypeReference.
     *
     * @param rawContent raw string from the AI response
     * @param typeRef    Jackson type reference for the target type
     * @return Optional of the parsed object, or empty on failure
     */
    public <T> Optional<T> parseToType(String rawContent, TypeReference<T> typeRef) {
        if (rawContent == null || rawContent.isBlank()) return Optional.empty();

        String extracted = extractJson(rawContent);
        if (extracted == null) return Optional.empty();

        try {
            return Optional.of(objectMapper.readValue(extracted, typeRef));
        } catch (JsonProcessingException e) {
            log.warn("[AiJsonParser] Type-safe parse error: {}", e.getOriginalMessage());
            return Optional.empty();
        }
    }

    /**
     * Validates that a raw content string is syntactically valid JSON.
     *
     * @param rawContent string to validate
     * @return true if valid JSON, false otherwise
     */
    public boolean isValidJson(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) return false;
        try {
            JsonNode node = objectMapper.readTree(rawContent);
            return node != null && !node.isMissingNode();
        } catch (JsonProcessingException e) {
            return false;
        }
    }

    /**
     * Serializes an object to a compact JSON string.
     * Returns "{}" on serialization failure.
     *
     * @param value the object to serialize
     * @return JSON string representation
     */
    public String toJson(Object value) {
        if (value == null) return "null";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("[AiJsonParser] Serialization failed: {}", e.getMessage());
            return "{}";
        }
    }

    /**
     * Extracts clean JSON from raw AI content using a three-stage pipeline.
     *
     * Stage 1: Try direct parse (happy path — used when response_format=json_object works)
     * Stage 2: Extract from markdown code fence (```json ... ```)
     * Stage 3: Extract first JSON object via regex (last resort)
     *
     * @param rawContent raw AI output
     * @return extracted JSON string, or null if all extraction strategies fail
     */
    private String extractJson(String rawContent) {
        String trimmed = rawContent.trim();

        if (isValidJson(trimmed)) {
            return trimmed;
        }

        Matcher fenceMatcher = MARKDOWN_FENCE_PATTERN.matcher(trimmed);
        if (fenceMatcher.find()) {
            String candidate = fenceMatcher.group(1).trim();
            if (isValidJson(candidate)) {
                log.debug("[AiJsonParser] Extracted JSON from markdown fence");
                return candidate;
            }
        }

        Matcher objectMatcher = JSON_OBJECT_PATTERN.matcher(trimmed);
        if (objectMatcher.find()) {
            String candidate = objectMatcher.group().trim();
            if (isValidJson(candidate)) {
                log.debug("[AiJsonParser] Extracted JSON via object regex");
                return candidate;
            }
        }

        return null;
    }
}
