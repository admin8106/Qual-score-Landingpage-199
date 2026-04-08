package com.qualscore.qualcore.dto.request;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.validation.ValidLinkedInUrl;
import com.qualscore.qualcore.validation.ValidMobileNumber;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCandidateProfileRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters")
    private String fullName;

    @NotBlank(message = "Email address is required")
    @Email(message = "Email address must be valid")
    private String email;

    @NotBlank(message = "Mobile number is required")
    @ValidMobileNumber
    private String mobileNumber;

    @NotBlank(message = "Location is required")
    @Size(max = 120, message = "Location must not exceed 120 characters")
    private String location;

    @NotBlank(message = "Current role is required")
    @Size(max = 120, message = "Current role must not exceed 120 characters")
    private String currentRole;

    @NotNull(message = "Career stage is required")
    private CareerStage careerStage;

    @NotBlank(message = "Industry is required")
    @Size(max = 100, message = "Industry must not exceed 100 characters")
    private String industry;

    @NotBlank(message = "LinkedIn profile URL is required")
    @ValidLinkedInUrl
    private String linkedinUrl;

    /**
     * Optional: candidate-pasted LinkedIn About section text.
     * When provided, enables CANDIDATE_TEXT ingestion mode for LinkedIn analysis,
     * producing more accurate scoring than URL-only mode.
     * The frontend may offer a "Paste your LinkedIn About section" field to collect this.
     */
    @Size(max = 3000, message = "LinkedIn About text must not exceed 3000 characters")
    private String linkedinAboutText;

    /**
     * Optional: candidate-pasted LinkedIn experience section text.
     * Supplements linkedinAboutText when provided.
     * Improves experiencePresentation and proofOfWorkVisibility scoring accuracy.
     */
    @Size(max = 5000, message = "LinkedIn experience text must not exceed 5000 characters")
    private String linkedinExperienceText;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    @NotBlank(message = "Payment reference is required for profile creation")
    private String paymentReference;
}
