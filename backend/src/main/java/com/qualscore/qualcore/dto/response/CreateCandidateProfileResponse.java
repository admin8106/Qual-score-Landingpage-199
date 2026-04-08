package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.CareerStage;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateCandidateProfileResponse {
    private String candidateCode;
    private String fullName;
    private String email;
    private CareerStage careerStage;
    private String industry;
    private String linkedinUrl;
    private String createdAt;
}
