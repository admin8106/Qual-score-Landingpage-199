package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SaveCandidateProfileResponse {
    private String leadId;
    private String sessionId;
    private String createdAt;
}
