package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.PaymentStatus;
import com.qualscore.qualcore.enums.ScoreBand;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "leads", indexes = {
        @Index(name = "idx_leads_email", columnList = "email"),
        @Index(name = "idx_leads_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "location")
    private String location;

    @Column(name = "job_role", nullable = false)
    private String jobRole;

    @Column(name = "target_role")
    private String targetRole;

    @Column(name = "years_experience")
    private String yearsExperience;

    @Enumerated(EnumType.STRING)
    @Column(name = "career_stage")
    private CareerStage careerStage;

    @Column(name = "industry")
    private String industry;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "payment_ref")
    private String paymentRef;

    @Column(name = "payment_order_id")
    private String paymentOrderId;

    @Column(name = "final_employability_score", precision = 4, scale = 1)
    private BigDecimal finalEmployabilityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_band")
    private ScoreBand scoreBand;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "crm_tags", columnDefinition = "text[]")
    private List<String> crmTags = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DiagnosticSession> diagnosticSessions = new ArrayList<>();
}
