package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiagnosticReportRepository extends JpaRepository<DiagnosticReport, UUID> {

    Optional<DiagnosticReport> findTopByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    List<DiagnosticReport> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    Page<DiagnosticReport> findByReportStatusOrderByCreatedAtDesc(ReportStatus reportStatus, Pageable pageable);

    boolean existsByCandidateProfileId(UUID candidateProfileId);

    long countByReportStatus(ReportStatus reportStatus);
}
