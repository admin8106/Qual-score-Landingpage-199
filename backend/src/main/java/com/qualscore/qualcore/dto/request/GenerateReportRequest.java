package com.qualscore.qualcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GenerateReportRequest {

    @NotBlank(message = "Lead ID is required")
    private String leadId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotNull(message = "Candidate details are required")
    @Valid
    private CandidateDetailsDto candidateDetails;

    @NotNull(message = "Evaluation data is required")
    private FinalScoreDto evaluation;
}
