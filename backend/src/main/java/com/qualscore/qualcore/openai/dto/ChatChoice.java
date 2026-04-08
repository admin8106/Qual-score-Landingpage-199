package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * A single completion choice returned by the OpenAI API.
 * The API may return multiple choices; we always use index 0.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatChoice {

    private int index;
    private ChatMessage message;

    @JsonProperty("finish_reason")
    private String finishReason;
}
