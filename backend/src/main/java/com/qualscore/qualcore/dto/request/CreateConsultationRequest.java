package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for POST /api/v1/consultations
 *
 * candidateReference is the candidate_code assigned after payment/profile creation.
 * preferredDate must be a date string in ISO format (YYYY-MM-DD).
 * preferredTime must be a valid time slot string (e.g., "10:00 AM", "14:00").
 */
@Data
public class CreateConsultationRequest {

    @NotBlank(message = "Candidate reference is required")
    private String candidateReference;

    @NotBlank(message = "Preferred date is required")
    @Pattern(
            regexp = "^\\d{4}-\\d{2}-\\d{2}$",
            message = "Preferred date must be in YYYY-MM-DD format"
    )
    private String preferredDate;

    @NotBlank(message = "Preferred time is required")
    @Size(max = 20, message = "Preferred time must not exceed 20 characters")
    private String preferredTime;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;
}
