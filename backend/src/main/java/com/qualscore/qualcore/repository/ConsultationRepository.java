package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.Consultation;
import com.qualscore.qualcore.enums.ConsultationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    Optional<Consultation> findByBookingRef(String bookingRef);

    Optional<Consultation> findByLeadId(String leadId);

    Page<Consultation> findByStatusOrderByCreatedAtDesc(ConsultationStatus status, Pageable pageable);

    boolean existsByBookingRef(String bookingRef);
}
