package com.qualscore.qualcore.dto.request;

import com.qualscore.qualcore.validation.ValidLinkedInUrl;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LinkedInAnalysisTriggerRequest {

    @NotBlank(message = "Candidate code is required")
    private String candidateCode;

    @NotBlank(message = "LinkedIn URL is required")
    @ValidLinkedInUrl
    private String linkedinUrl;
}
