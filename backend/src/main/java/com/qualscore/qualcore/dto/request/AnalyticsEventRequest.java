package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class AnalyticsEventRequest {

    @NotBlank(message = "Event name is required")
    @Size(max = 80, message = "Event name must not exceed 80 characters")
    private String eventName;

    private String candidateCode;

    @Size(max = 80, message = "Source must not exceed 80 characters")
    private String source;

    private Map<String, Object> metadata;
}
