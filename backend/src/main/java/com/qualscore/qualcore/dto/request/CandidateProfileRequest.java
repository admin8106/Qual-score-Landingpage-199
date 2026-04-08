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
public class CandidateProfileRequest {

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

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    @NotBlank(message = "Payment reference is required")
    private String paymentReference;
}
