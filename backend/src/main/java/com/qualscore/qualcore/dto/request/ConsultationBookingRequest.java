package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConsultationBookingRequest {

    @NotBlank(message = "Candidate code is required")
    private String candidateCode;

    @NotBlank(message = "Preferred date is required")
    @Size(max = 30, message = "Preferred date must not exceed 30 characters")
    private String preferredDate;

    @NotBlank(message = "Preferred time slot is required")
    @Size(max = 20, message = "Preferred time must not exceed 20 characters")
    private String preferredTime;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;
}
