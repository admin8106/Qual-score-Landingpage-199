package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class GenerateReportResponse {
    private String reportId;
    private Map<String, Object> reportData;
    private String generatedAt;
}
