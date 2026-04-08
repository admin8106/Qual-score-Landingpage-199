package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.dto.response.AdminLeadV1ListResponse;
import com.qualscore.qualcore.dto.response.AdminLeadV1Record;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.BookingStatus;
import com.qualscore.qualcore.enums.LeadPriority;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.ConsultationBookingRepository;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.repository.DiagnosticScoreRepository;
import com.qualscore.qualcore.repository.PaymentTransactionRepository;
import com.qualscore.qualcore.audit.AuditEventType;
import com.qualscore.qualcore.audit.AuditLogService;
import com.qualscore.qualcore.service.AdminLeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Admin lead service implementation.
 *
 * ─────────────────────────────────────────────────────────
 * Data aggregation strategy:
 *   For each CandidateProfile, we perform targeted lookups on:
 *     - DiagnosticScore    → score, bandLabel, tagsJson
 *     - DiagnosticReport   → reportStatus
 *     - ConsultationBooking → most recent booking status
 *     - PaymentTransaction  → most recent transaction status
 *
 *   This is intentionally N+1 for admin views where page sizes
 *   are small (≤50). For larger datasets, replace with a
 *   single JOIN projection query.
 *
 * ─────────────────────────────────────────────────────────
 * Priority derivation (tag-based, not persisted):
 *   HIGH   → "high_pain_lead" or "consultation_priority" in tags
 *   MEDIUM → "warm_diagnostic_lead" or "high_intent" in tags
 *   NORMAL → default
 *
 * ─────────────────────────────────────────────────────────
 * Filter design (future admin UI ready):
 *   "all"      → all candidates, newest first
 *   "high"     → HIGH priority derived candidates
 *   "medium"   → MEDIUM priority derived candidates
 *   "reported" → candidates who have a DiagnosticReport
 *   "booked"   → candidates with REQUESTED or CONFIRMED booking
 *   search     → fullName / email / mobileNumber / candidateCode
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminLeadServiceImpl implements AdminLeadService {

    private static final Set<String> HIGH_PRIORITY_TAGS  = Set.of("high_pain_lead", "consultation_priority");
    private static final Set<String> MEDIUM_PRIORITY_TAGS = Set.of("warm_diagnostic_lead", "high_intent");

    private final CandidateProfileRepository candidateProfileRepository;
    private final DiagnosticScoreRepository  diagnosticScoreRepository;
    private final DiagnosticReportRepository diagnosticReportRepository;
    private final ConsultationBookingRepository consultationBookingRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public AdminLeadV1ListResponse fetchLeads(int limit, int offset, String filter, String search) {
        PageRequest pageable = PageRequest.of(offset / Math.max(limit, 1), Math.max(limit, 1));

        Page<CandidateProfile> page;

        if (search != null && !search.isBlank()) {
            page = candidateProfileRepository.search(search, pageable);
        } else {
            page = switch (filter != null ? filter : "all") {
                case "reported" -> candidateProfileRepository.findWithReport(pageable);
                case "booked"   -> candidateProfileRepository.findWithActiveBooking(pageable);
                default         -> candidateProfileRepository.findAllByOrderByCreatedAtDesc(pageable);
            };
        }

        List<AdminLeadV1Record> records = page.getContent().stream()
                .map(this::buildRecord)
                .filter(r -> applyPriorityFilter(r, filter))
                .toList();

        auditLogService.success(
                AuditEventType.ADMIN_LEADS_FETCHED,
                "ADMIN",
                "CandidateProfile",
                "list",
                Map.of("filter", filter != null ? filter : "all",
                        "search", search != null ? search : "",
                        "resultCount", records.size(),
                        "total", page.getTotalElements()));

        return AdminLeadV1ListResponse.builder()
                .leads(records)
                .total(page.getTotalElements())
                .hasMore(page.hasNext())
                .fetchedAt(OffsetDateTime.now().toString())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminLeadV1Record getLeadByCandidateReference(String candidateReference) {
        CandidateProfile candidate = candidateProfileRepository
                .findByCandidateCode(candidateReference)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateReference));
        AdminLeadV1Record record = buildRecord(candidate);
        auditLogService.success(
                AuditEventType.ADMIN_LEAD_DETAIL_FETCHED,
                "ADMIN",
                "CandidateProfile",
                candidateReference,
                Map.of("priority", record.getLeadPriority().name()));
        return record;
    }

    private AdminLeadV1Record buildRecord(CandidateProfile candidate) {
        Optional<DiagnosticScore> scoreOpt = diagnosticScoreRepository
                .findByCandidateProfileId(candidate.getId());

        List<String> tags = scoreOpt
                .map(s -> parseTags(s.getTagsJson()))
                .orElse(Collections.emptyList());

        Optional<DiagnosticReport> reportOpt = diagnosticReportRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());

        Optional<ConsultationBooking> bookingOpt = consultationBookingRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());

        List<PaymentTransaction> payments = paymentTransactionRepository
                .findByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());

        String paymentStatus = resolvePaymentStatus(payments);
        String reportStatus  = reportOpt.map(r -> r.getReportStatus().name()).orElse("NONE");
        String consultationStatus = bookingOpt
                .map(b -> b.getBookingStatus().name())
                .orElse("NONE");

        LeadPriority priority = derivePriority(tags);

        return AdminLeadV1Record.builder()
                .candidateReference(candidate.getCandidateCode())
                .fullName(candidate.getFullName())
                .mobileNumber(candidate.getMobileNumber())
                .email(candidate.getEmail())
                .currentRole(candidate.getCurrentRole())
                .totalExperienceYears(candidate.getTotalExperienceYears())
                .careerStage(candidate.getCareerStage())
                .industry(candidate.getIndustry())
                .linkedinUrl(candidate.getLinkedinUrl())
                .finalEmployabilityScore(scoreOpt.map(DiagnosticScore::getFinalEmployabilityScore).orElse(null))
                .bandLabel(scoreOpt.map(DiagnosticScore::getBandLabel).orElse(null))
                .tags(tags)
                .leadPriority(priority)
                .consultationStatus(consultationStatus)
                .paymentStatus(paymentStatus)
                .reportStatus(reportStatus)
                .createdAt(candidate.getCreatedAt())
                .build();
    }

    private boolean applyPriorityFilter(AdminLeadV1Record record, String filter) {
        if (filter == null) return true;
        return switch (filter) {
            case "high"   -> record.getLeadPriority() == LeadPriority.HIGH;
            case "medium" -> record.getLeadPriority() == LeadPriority.MEDIUM;
            default       -> true;
        };
    }

    @Override
    public LeadPriority derivePriority(List<String> tags) {
        if (tags == null || tags.isEmpty()) return LeadPriority.NORMAL;
        for (String tag : tags) {
            if (HIGH_PRIORITY_TAGS.contains(tag)) return LeadPriority.HIGH;
        }
        for (String tag : tags) {
            if (MEDIUM_PRIORITY_TAGS.contains(tag)) return LeadPriority.MEDIUM;
        }
        return LeadPriority.NORMAL;
    }

    private String resolvePaymentStatus(List<PaymentTransaction> payments) {
        if (payments == null || payments.isEmpty()) return "NONE";
        for (PaymentTransaction pt : payments) {
            if (pt.getStatus() == PaymentTransactionStatus.SUCCESS
                    || pt.getStatus() == PaymentTransactionStatus.VERIFIED) return "COMPLETED";
        }
        for (PaymentTransaction pt : payments) {
            if (pt.getStatus() == PaymentTransactionStatus.INITIATED) return "PENDING";
        }
        return payments.get(0).getStatus().name();
    }

    private List<String> parseTags(String tagsJson) {
        if (tagsJson == null || tagsJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[AdminLeadService] Failed to parse tags JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
