package com.qualscore.qualcore.openai.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Wraps the outcome of a single OpenAI API call attempt.
 *
 * Used internally by {@link com.qualscore.qualcore.openai.OpenAiClient}
 * to carry result state through the retry/validation pipeline.
 */
@Data
@Builder
public class AiCallResult {

    /**
     * Whether this call produced a valid, parseable JSON response.
     */
    private boolean success;

    /**
     * The raw text content returned by the model.
     * Always stored — even on failure — for audit and debugging.
     */
    private String rawContent;

    /**
     * The parsed JSON string extracted from rawContent.
     * Null if parsing failed.
     */
    private String parsedJson;

    /**
     * Error message if the call or parsing failed.
     */
    private String errorMessage;

    /**
     * Finish reason from the OpenAI response (e.g. "stop", "length").
     */
    private String finishReason;

    /**
     * Token usage from the API response. Null on network failure.
     */
    private ChatUsage usage;

    /**
     * Which attempt number produced this result (1 = first, 2 = retry).
     */
    private int attemptNumber;
}
