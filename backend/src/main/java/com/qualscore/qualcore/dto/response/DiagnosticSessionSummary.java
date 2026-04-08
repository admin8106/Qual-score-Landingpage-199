package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DiagnosticSessionSummary {
    private String sessionId;
    private String status;
    private BigDecimal finalEmployabilityScore;
    private String scoreBand;
    private String completedAt;
}
