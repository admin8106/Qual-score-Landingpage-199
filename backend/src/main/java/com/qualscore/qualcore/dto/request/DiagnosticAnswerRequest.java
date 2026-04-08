package com.qualscore.qualcore.dto.request;

import com.qualscore.qualcore.validation.ValidQuestionCode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DiagnosticAnswerRequest {

    @NotBlank(message = "Question code is required")
    @ValidQuestionCode
    private String questionCode;

    @NotNull(message = "Selected option code is required")
    @NotBlank(message = "Selected option code is required")
    private String selectedOptionCode;

    @NotNull(message = "Score is required")
    @Min(value = 1, message = "Score must be at least 1")
    @Max(value = 10, message = "Score must not exceed 10")
    private Integer score;
}
