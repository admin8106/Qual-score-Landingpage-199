package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/**
 * Request body for POST /api/v1/payments/initiate.
 *
 * candidateName and email are optional at payment initiation time —
 * the user has not yet filled out their profile (profile collection
 * happens after payment is confirmed). These fields are stored for
 * audit and gateway order metadata when provided.
 */
@Data
public class PaymentInitiateRequest {

    private String candidateName;

    @Email(message = "Email address must be valid")
    private String email;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Integer amountPaise;

    private String currency = "INR";

    private String notes;
}
