package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.CareerStage;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class CandidateProfileResponse {

    private UUID id;
    private String candidateCode;
    private String fullName;
    private String email;
    private String mobileNumber;
    private String location;
    private String currentRole;
    private CareerStage careerStage;
    private String industry;
    private String linkedinUrl;
    private String notes;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
