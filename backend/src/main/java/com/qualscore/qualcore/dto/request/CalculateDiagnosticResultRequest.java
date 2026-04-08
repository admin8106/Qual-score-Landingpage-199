package com.qualscore.qualcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CalculateDiagnosticResultRequest {

    @NotBlank(message = "Lead ID is required")
    private String leadId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotNull
    @NotEmpty(message = "Answers are required for scoring")
    @Valid
    private List<DiagnosticAnswerDto> answers;

    @NotNull(message = "Candidate details are required")
    @Valid
    private CandidateDetailsDto candidateDetails;

    private LinkedInAnalysisDto linkedInAnalysis;
}
