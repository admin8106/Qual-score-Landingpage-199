package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.enums.ConsultationStatus;
import com.qualscore.qualcore.enums.ScoreBand;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "consultations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "lead_id")
    private String leadId;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false)
    private String candidateEmail;

    @Column(name = "candidate_phone", nullable = false)
    private String candidatePhone;

    @Column(name = "job_role", nullable = false)
    private String jobRole;

    @Column(name = "preferred_date", nullable = false)
    private String preferredDate;

    @Column(name = "preferred_time", nullable = false)
    private String preferredTime;

    @Column(name = "notes")
    private String notes;

    @Column(name = "employability_score", nullable = false, precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal employabilityScore = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_band", nullable = false)
    @Builder.Default
    private ScoreBand scoreBand = ScoreBand.NEEDS_OPTIMIZATION;

    @Column(name = "booking_ref", nullable = false, unique = true)
    private String bookingRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ConsultationStatus status = ConsultationStatus.PENDING;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(name = "calendar_event_id")
    private String calendarEventId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
