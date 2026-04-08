package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Request payload for the OpenAI Chat Completions API.
 *
 * Reference: https://platform.openai.com/docs/api-reference/chat/create
 *
 * For structured JSON output (Prompt B), always set:
 *   responseFormat = ResponseFormat.jsonObject()
 *   temperature    = 0.0–0.2 (low temperature = more consistent JSON structure)
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatRequest {

    private String model;
    private List<ChatMessage> messages;

    @JsonProperty("max_tokens")
    private int maxTokens;

    private double temperature;

    @JsonProperty("response_format")
    private ResponseFormat responseFormat;

    /**
     * Optional: unique identifier for tracking this request in OpenAI logs.
     * Set to candidateCode or reportId for audit purposes.
     */
    @JsonProperty("user")
    private String userReference;
}
