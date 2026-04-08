package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.LeadPriority;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Full admin lead record returned by GET /api/v1/admin/leads
 * and GET /api/v1/admin/leads/{candidateReference}.
 *
 * Priority is derived in service layer — not persisted.
 * All status fields reflect the most recent state of each entity.
 */
@Data
@Builder
public class AdminLeadV1Record {

    private String candidateReference;
    private String fullName;
    private String mobileNumber;
    private String email;
    private String currentRole;
    private String totalExperienceYears;
    private CareerStage careerStage;
    private String industry;
    private String linkedinUrl;

    private BigDecimal finalEmployabilityScore;
    private String bandLabel;
    private List<String> tags;
    private LeadPriority leadPriority;

    private String consultationStatus;
    private String paymentStatus;
    private String reportStatus;

    private OffsetDateTime createdAt;
}
