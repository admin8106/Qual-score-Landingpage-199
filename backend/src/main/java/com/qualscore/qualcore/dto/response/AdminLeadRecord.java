package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AdminLeadRecord {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String location;
    private String jobRole;
    private String yearsExperience;
    private String careerStage;
    private String industry;
    private String linkedinUrl;
    private String paymentStatus;
    private BigDecimal finalEmployabilityScore;
    private String scoreBand;
    private List<String> crmTags;
    private String createdAt;
    private DiagnosticSessionSummary diagnosticSession;
    private ConsultationSummary consultation;
}
