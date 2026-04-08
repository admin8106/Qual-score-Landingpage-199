package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import com.qualscore.qualcore.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "consultation_bookings",
        indexes = {
                @Index(name = "idx_cb_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_cb_booking_status", columnList = "booking_status"),
                @Index(name = "idx_cb_preferred_date", columnList = "preferred_date")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationBooking extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id", nullable = false)
    private CandidateProfile candidateProfile;

    @Column(name = "preferred_date", nullable = false, length = 30)
    private String preferredDate;

    @Column(name = "preferred_time", nullable = false, length = 20)
    private String preferredTime;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status", nullable = false, length = 20)
    @Builder.Default
    private BookingStatus bookingStatus = BookingStatus.REQUESTED;
}
