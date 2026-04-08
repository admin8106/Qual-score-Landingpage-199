package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EarlyLeadRecord {
    private String id;
    private String email;
    private String name;
    private String phone;
    private String funnelStage;
    private List<String> dropTags;
    private String paymentStatus;
    private String candidateCode;
    private boolean reportGenerated;
    private boolean complete;
    private String createdAt;
    private String updatedAt;
}
