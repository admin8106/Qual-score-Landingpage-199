package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LogAnalyticsEventResponse {
    private String eventId;
    private boolean recorded;
}
