package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DiagnosticAnswerDto {

    @NotNull(message = "Question ID is required")
    @Min(value = 1, message = "Question ID must be between 1 and 15")
    @Max(value = 15, message = "Question ID must be between 1 and 15")
    private Integer questionId;

    @NotBlank(message = "Answer value is required")
    private String value;

    @NotNull(message = "Score is required")
    @Min(value = 1, message = "Score must be between 1 and 10")
    @Max(value = 10, message = "Score must be between 1 and 10")
    private Integer score;

    @NotBlank(message = "Category is required")
    private String category;
}
