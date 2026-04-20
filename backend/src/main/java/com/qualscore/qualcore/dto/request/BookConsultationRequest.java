package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class BookConsultationRequest {

    @NotBlank(message = "Lead ID is required")
    private String leadId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotBlank(message = "Candidate name is required")
    private String candidateName;

    @NotBlank(message = "Candidate email is required")
    @Email(message = "Candidate email must be valid")
    private String candidateEmail;

    @NotBlank(message = "Candidate phone is required")
    private String candidatePhone;

    @NotBlank(message = "Job role is required")
    private String jobRole;

    @NotBlank(message = "Preferred date is required")
    private String preferredDate;

    @NotBlank(message = "Preferred time is required")
    private String preferredTime;

    private String notes;

    @NotNull(message = "Employability score is required")
    @DecimalMin(value = "0.0", message = "Score must be between 0 and 10")
    @DecimalMax(value = "10.0", message = "Score must be between 0 and 10")
    private Double employabilityScore;

    @NotBlank(message = "Score band is required")
    private String scoreBand;
}
