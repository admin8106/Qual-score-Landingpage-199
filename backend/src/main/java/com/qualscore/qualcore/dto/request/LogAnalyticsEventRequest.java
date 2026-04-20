package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class LogAnalyticsEventRequest {

    @NotBlank(message = "Event name is required")
    private String eventName;

    private Map<String, Object> properties;

    @NotBlank(message = "Anonymous ID is required")
    private String anonymousId;

    @NotNull(message = "Occurred at timestamp is required")
    private String occurredAt;
}
