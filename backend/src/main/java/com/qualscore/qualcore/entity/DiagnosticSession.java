package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.enums.ScoreBand;
import com.qualscore.qualcore.enums.SessionStatus;
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
@Table(name = "diagnostic_sessions", indexes = {
        @Index(name = "idx_diagnostic_sessions_lead_id", columnList = "lead_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", columnDefinition = "jsonb")
    @Builder.Default
    private List<DiagnosticAnswerEmbed> answers = new ArrayList<>();

    @Column(name = "overall_score")
    @Builder.Default
    private Integer overallScore = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "category_scores", columnDefinition = "jsonb")
    private String categoryScoresJson;

    @Column(name = "final_employability_score", precision = 4, scale = 1)
    private BigDecimal finalEmployabilityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_band")
    private ScoreBand scoreBand;

    @Column(name = "linkedin_score", precision = 4, scale = 1)
    private BigDecimal linkedinScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "section_scores", columnDefinition = "jsonb")
    private String sectionScoresJson;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "crm_tags", columnDefinition = "text[]")
    private List<String> crmTags = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linkedin_analysis", columnDefinition = "jsonb")
    private String linkedinAnalysisJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SessionStatus status = SessionStatus.IN_PROGRESS;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Report> reports = new ArrayList<>();
}
