package com.qualscore.qualcore.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "analytics_events",
        indexes = {
                @Index(name = "analytics_events_event_name_idx", columnList = "event_name"),
                @Index(name = "analytics_events_created_at_idx", columnList = "created_at"),
                @Index(name = "analytics_events_candidate_profile_id_idx", columnList = "candidate_profile_id"),
                @Index(name = "analytics_events_source_idx", columnList = "source")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id")
    private CandidateProfile candidateProfile;

    @Column(name = "event_name", nullable = false, length = 80)
    private String eventName;

    @Column(name = "source", length = 80)
    private String source;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    private String metadataJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
