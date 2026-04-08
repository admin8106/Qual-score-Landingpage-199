package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * A single message in an OpenAI chat conversation.
 *
 * Roles:
 *   "system"    — sets behavioral instructions for the model
 *   "user"      — the user input / prompt payload
 *   "assistant" — the model's prior response (used for multi-turn)
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatMessage {

    private String role;
    private String content;

    public static ChatMessage system(String content) {
        return ChatMessage.builder().role("system").content(content).build();
    }

    public static ChatMessage user(String content) {
        return ChatMessage.builder().role("user").content(content).build();
    }
}
