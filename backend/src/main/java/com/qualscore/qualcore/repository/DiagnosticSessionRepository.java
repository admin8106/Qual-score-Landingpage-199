package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.DiagnosticSession;
import com.qualscore.qualcore.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiagnosticSessionRepository extends JpaRepository<DiagnosticSession, UUID> {

    List<DiagnosticSession> findByLeadIdOrderByCreatedAtDesc(UUID leadId);

    Optional<DiagnosticSession> findTopByLeadIdOrderByCreatedAtDesc(UUID leadId);

    Optional<DiagnosticSession> findByIdAndLeadId(UUID sessionId, UUID leadId);

    long countByStatus(SessionStatus status);
}
