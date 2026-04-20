package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DiagnosticAnalysisStatusResponse {
    private String candidateCode;
    private boolean analysisComplete;
    private boolean reportGenerated;
    private String bandLabel;
    private Double finalEmployabilityScore;
    private String reportStatus;
    private String analyzedAt;
}
