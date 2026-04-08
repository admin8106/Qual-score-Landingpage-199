package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import com.qualscore.qualcore.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(
        name = "diagnostic_reports",
        indexes = {
                @Index(name = "idx_dr_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_dr_report_status", columnList = "report_status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticReport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id", nullable = false)
    private CandidateProfile candidateProfile;

    @Column(name = "report_title")
    private String reportTitle;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_summary_json", columnDefinition = "jsonb")
    private String scoreSummaryJson;

    @Column(name = "linkedin_insight", columnDefinition = "text")
    private String linkedinInsight;

    @Column(name = "behavioral_insight", columnDefinition = "text")
    private String behavioralInsight;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dimension_breakdown_json", columnDefinition = "jsonb")
    private String dimensionBreakdownJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_gaps_json", columnDefinition = "jsonb")
    private String topGapsJson;

    @Column(name = "risk_projection", columnDefinition = "text")
    private String riskProjection;

    @Column(name = "recommendation", columnDefinition = "text")
    private String recommendation;

    @Column(name = "recruiter_view_insight", columnDefinition = "text")
    private String recruiterViewInsight;

    @Column(name = "cta_headline")
    private String ctaHeadline;

    @Column(name = "cta_body", columnDefinition = "text")
    private String ctaBody;

    @Column(name = "cta_button_text", length = 80)
    private String ctaButtonText;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_status", nullable = false, length = 20)
    @Builder.Default
    private ReportStatus reportStatus = ReportStatus.GENERATED_AI;

    @Column(name = "tagline", columnDefinition = "text")
    private String tagline;

    @Column(name = "raw_ai_response", columnDefinition = "text")
    private String rawAiResponse;

    @Column(name = "prompt_version", length = 20)
    private String promptVersion;

    @Column(name = "ai_failure_reason", columnDefinition = "text")
    private String aiFailureReason;

    @Column(name = "ai_attempts")
    @Builder.Default
    private Integer aiAttempts = 0;
}
