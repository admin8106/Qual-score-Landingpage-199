package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DiagnosticAnalysisTriggerRequest {

    @NotBlank(message = "Candidate code is required")
    private String candidateCode;

    private boolean forceRecalculate = false;
}
