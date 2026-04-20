package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Full response payload from the OpenAI Chat Completions API.
 *
 * The content we care about is at:
 *   choices[0].message.content
 *
 * Always check that choices is non-empty and finishReason is "stop"
 * before trusting the content. A finishReason of "length" means the
 * response was truncated — treat this as a parsing failure and retry.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatResponse {

    private String id;
    private String model;
    private List<ChatChoice> choices;
    private ChatUsage usage;

    /**
     * Extracts the raw text content from the first completion choice.
     *
     * @return content string, or null if choices is empty or message is null
     */
    public String firstContent() {
        if (choices == null || choices.isEmpty()) return null;
        ChatChoice first = choices.get(0);
        if (first.getMessage() == null) return null;
        return first.getMessage().getContent();
    }

    /**
     * Returns the finish reason of the first choice.
     * "stop"   = completed normally
     * "length" = truncated (max_tokens hit) — JSON will likely be malformed
     */
    public String firstFinishReason() {
        if (choices == null || choices.isEmpty()) return null;
        return choices.get(0).getFinishReason();
    }
}
