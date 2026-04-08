package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    Optional<Report> findTopBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    Optional<Report> findTopByLeadIdOrderByCreatedAtDesc(UUID leadId);

    boolean existsBySessionId(UUID sessionId);
}
