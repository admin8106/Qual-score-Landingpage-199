package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.Lead;
import com.qualscore.qualcore.enums.PaymentStatus;
import com.qualscore.qualcore.enums.ScoreBand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {

    Optional<Lead> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<Lead> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Lead> findByPaymentStatusOrderByCreatedAtDesc(PaymentStatus paymentStatus, Pageable pageable);

    Page<Lead> findByScoreBandOrderByCreatedAtDesc(ScoreBand scoreBand, Pageable pageable);

    @Query("""
            SELECT l FROM Lead l
            WHERE (:search IS NULL OR LOWER(l.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY l.createdAt DESC
            """)
    Page<Lead> searchLeads(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT l FROM Lead l
            JOIN l.diagnosticSessions ds
            WHERE ds.scoreBand IN ('CRITICAL', 'NEEDS_OPTIMIZATION')
               OR 'consultation_priority' MEMBER OF l.crmTags
               OR 'high_pain_lead' MEMBER OF l.crmTags
            ORDER BY l.createdAt DESC
            """)
    Page<Lead> findHighPriorityLeads(Pageable pageable);

    long countByPaymentStatus(PaymentStatus paymentStatus);
}
