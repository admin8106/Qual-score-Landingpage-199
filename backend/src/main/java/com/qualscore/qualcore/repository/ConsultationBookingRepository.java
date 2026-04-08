package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationBookingRepository extends JpaRepository<ConsultationBooking, UUID> {

    List<ConsultationBooking> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    Optional<ConsultationBooking> findTopByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    Page<ConsultationBooking> findByBookingStatusOrderByCreatedAtDesc(BookingStatus bookingStatus, Pageable pageable);

    long countByBookingStatus(BookingStatus bookingStatus);
}
