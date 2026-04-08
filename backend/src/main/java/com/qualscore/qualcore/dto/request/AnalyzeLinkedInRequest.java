package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.URL;

@Data
public class AnalyzeLinkedInRequest {

    @NotBlank(message = "LinkedIn URL is required")
    @URL(message = "LinkedIn URL must be a valid URL")
    private String linkedinUrl;

    @NotBlank(message = "Candidate name is required")
    private String candidateName;

    @NotBlank(message = "Job role is required")
    private String jobRole;

    private String industry;
    private String yearsExperience;
    private String location;

    @NotBlank(message = "Lead ID is required")
    private String leadId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;
}
