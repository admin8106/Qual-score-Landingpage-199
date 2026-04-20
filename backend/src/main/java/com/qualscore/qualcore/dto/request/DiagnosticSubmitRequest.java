package com.qualscore.qualcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class DiagnosticSubmitRequest {

    @NotBlank(message = "Candidate code is required")
    private String candidateCode;

    @NotNull(message = "Answers are required")
    @Size(min = 15, max = 15, message = "All 15 question responses are required before submission")
    @Valid
    private List<DiagnosticAnswerRequest> answers;
}
