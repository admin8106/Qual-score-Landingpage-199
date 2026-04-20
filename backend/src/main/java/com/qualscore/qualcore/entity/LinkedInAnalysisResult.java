package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import com.qualscore.qualcore.enums.LinkedInAnalysisStatus;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
        name = "linkedin_analysis_results",
        indexes = {
                @Index(name = "idx_lar_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_lar_status", columnList = "analysis_status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LinkedInAnalysisResult extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id", nullable = false)
    private CandidateProfile candidateProfile;

    @Column(name = "headline_clarity")
    private Integer headlineClarity;

    @Column(name = "role_clarity")
    private Integer roleClarity;

    @Column(name = "profile_completeness")
    private Integer profileCompleteness;

    @Column(name = "about_quality")
    private Integer aboutQuality;

    @Column(name = "experience_presentation")
    private Integer experiencePresentation;

    @Column(name = "proof_of_work_visibility")
    private Integer proofOfWorkVisibility;

    @Column(name = "certifications_signal")
    private Integer certificationsSignal;

    @Column(name = "recommendation_signal")
    private Integer recommendationSignal;

    @Column(name = "activity_visibility")
    private Integer activityVisibility;

    @Column(name = "career_consistency")
    private Integer careerConsistency;

    @Column(name = "growth_progression")
    private Integer growthProgression;

    @Column(name = "differentiation_strength")
    private Integer differentiationStrength;

    @Column(name = "recruiter_attractiveness")
    private Integer recruiterAttractiveness;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "summary_notes", columnDefinition = "jsonb")
    private String summaryNotesJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_strengths", columnDefinition = "jsonb")
    private String topStrengthsJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_concerns", columnDefinition = "jsonb")
    private String topConcernsJson;

    @Column(name = "linkedin_score", precision = 4, scale = 1)
    private BigDecimal linkedinScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 20)
    @Builder.Default
    private LinkedInAnalysisStatus analysisStatus = LinkedInAnalysisStatus.PENDING;

    @Column(name = "ingestion_mode", length = 30)
    private String ingestionMode;

    @Column(name = "analysis_confidence", length = 10)
    private String analysisConfidence;

    @Column(name = "analysis_coverage", length = 10)
    private String analysisCoverage;
}
