package com.qualscore.qualcore.openai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Controls the output format of the OpenAI completion.
 *
 * For Prompt B (Report Generator), set type = "json_object" to enforce
 * strict JSON output. This is the primary guardrail against free-form text.
 *
 * NOTE: When using "json_object", the system prompt MUST mention JSON explicitly,
 * otherwise the API will return a 400 error.
 */
@Data
@Builder
public class ResponseFormat {

    @JsonProperty("type")
    private String type;

    public static ResponseFormat jsonObject() {
        return ResponseFormat.builder().type("json_object").build();
    }

    public static ResponseFormat text() {
        return ResponseFormat.builder().type("text").build();
    }
}
