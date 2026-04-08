package com.qualscore.qualcore.dto.request;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.validation.ValidLinkedInUrl;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CandidateDetailsDto {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String location;

    @NotBlank(message = "Job role is required")
    private String jobRole;

    private String yearsExperience;

    @NotNull(message = "Career stage is required")
    private CareerStage careerStage;

    private String industry;

    @ValidLinkedInUrl
    private String linkedinUrl;
}
