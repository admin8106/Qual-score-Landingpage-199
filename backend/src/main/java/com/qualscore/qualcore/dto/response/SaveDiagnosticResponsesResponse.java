package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class SaveDiagnosticResponsesResponse {
    private String sessionId;
    private Integer answersRecorded;
    private Map<String, Integer> categoryBreakdown;
    private String savedAt;
}
