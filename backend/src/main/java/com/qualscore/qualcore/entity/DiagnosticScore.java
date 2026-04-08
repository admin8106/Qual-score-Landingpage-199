package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
        name = "diagnostic_scores",
        indexes = {
                @Index(name = "idx_ds_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_ds_band_label", columnList = "band_label")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticScore extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id", nullable = false, unique = true)
    private CandidateProfile candidateProfile;

    @Column(name = "career_direction_score", precision = 4, scale = 1)
    private BigDecimal careerDirectionScore;

    @Column(name = "job_search_behavior_score", precision = 4, scale = 1)
    private BigDecimal jobSearchBehaviorScore;

    @Column(name = "opportunity_readiness_score", precision = 4, scale = 1)
    private BigDecimal opportunityReadinessScore;

    @Column(name = "flexibility_constraints_score", precision = 4, scale = 1)
    private BigDecimal flexibilityConstraintsScore;

    @Column(name = "improvement_intent_score", precision = 4, scale = 1)
    private BigDecimal improvementIntentScore;

    @Column(name = "linkedin_score", precision = 4, scale = 1)
    private BigDecimal linkedinScore;

    @Column(name = "final_employability_score", precision = 4, scale = 1)
    private BigDecimal finalEmployabilityScore;

    @Column(name = "band_label", length = 40)
    private String bandLabel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    private String tagsJson;
}
