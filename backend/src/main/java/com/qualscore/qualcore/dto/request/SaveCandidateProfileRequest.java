package com.qualscore.qualcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveCandidateProfileRequest {

    @NotNull(message = "Candidate details are required")
    @Valid
    private CandidateDetailsDto candidateDetails;

    @NotBlank(message = "Payment reference is required")
    private String paymentRef;

    @NotBlank(message = "Payment order ID is required")
    private String paymentOrderId;

    private String sessionId;
}
