package com.qualscore.qualcore.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "early_leads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EarlyLead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "anon_id", nullable = false)
    private String anonId;

    @Column(name = "email")
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "phone")
    private String phone;

    @Column(name = "funnel_stage", nullable = false)
    private String funnelStage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "drop_tags", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> dropTags = new ArrayList<>();

    @Column(name = "payment_ref")
    private String paymentRef;

    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private String paymentStatus = "none";

    @Column(name = "candidate_code")
    private String candidateCode;

    @Column(name = "report_generated", nullable = false)
    @Builder.Default
    private boolean reportGenerated = false;

    @Column(name = "is_complete", nullable = false)
    @Builder.Default
    private boolean complete = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
