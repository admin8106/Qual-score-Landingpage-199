package com.qualscore.qualcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SaveDiagnosticResponsesRequest {

    @NotBlank(message = "Lead ID is required")
    private String leadId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotNull
    @NotEmpty(message = "At least one answer is required")
    @Valid
    private List<DiagnosticAnswerDto> answers;

    private String completedAt;
}
