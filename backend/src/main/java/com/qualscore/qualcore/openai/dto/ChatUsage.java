package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Token usage metadata from the OpenAI API response.
 * Used for cost monitoring and logging.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatUsage {

    @JsonProperty("prompt_tokens")
    private int promptTokens;

    @JsonProperty("completion_tokens")
    private int completionTokens;

    @JsonProperty("total_tokens")
    private int totalTokens;
}
