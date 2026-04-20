package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.dto.request.CandidateDetailsDto;
import com.qualscore.qualcore.dto.request.SaveCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.*;
import com.qualscore.qualcore.entity.DiagnosticSession;
import com.qualscore.qualcore.entity.Lead;
import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.PaymentStatus;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.repository.ConsultationRepository;
import com.qualscore.qualcore.repository.DiagnosticSessionRepository;
import com.qualscore.qualcore.repository.LeadRepository;
import com.qualscore.qualcore.service.LeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final DiagnosticSessionRepository diagnosticSessionRepository;
    private final ConsultationRepository consultationRepository;

    @Override
    @Transactional
    public SaveCandidateProfileResponse saveCandidateProfile(SaveCandidateProfileRequest request) {
        CandidateDetailsDto details = request.getCandidateDetails();

        Lead lead = Lead.builder()
                .name(details.getName())
                .email(details.getEmail())
                .phone(details.getPhone())
                .location(details.getLocation())
                .jobRole(details.getJobRole())
                .targetRole(details.getJobRole())
                .yearsExperience(details.getYearsExperience())
                .careerStage(details.getCareerStage())
                .industry(details.getIndustry())
                .linkedinUrl(details.getLinkedinUrl())
                .paymentStatus(PaymentStatus.COMPLETED)
                .paymentRef(request.getPaymentRef())
                .paymentOrderId(request.getPaymentOrderId())
                .crmTags(new ArrayList<>())
                .build();

        lead = leadRepository.save(lead);

        DiagnosticSession session = DiagnosticSession.builder()
                .lead(lead)
                .build();

        session = diagnosticSessionRepository.save(session);
        log.info("Lead created: leadId={}, sessionId={}", lead.getId(), session.getId());

        return SaveCandidateProfileResponse.builder()
                .leadId(lead.getId().toString())
                .sessionId(session.getId().toString())
                .createdAt(lead.getCreatedAt().toString())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminLeadRecord getLeadById(UUID leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId.toString()));
        return toAdminLeadRecord(lead);
    }

    @Override
    @Transactional(readOnly = true)
    public FetchAdminLeadsResponse fetchAdminLeads(int limit, int offset, String filter, String search) {
        PageRequest pageable = PageRequest.of(offset / limit, limit);
        Page<Lead> page;

        if (search != null && !search.isBlank()) {
            page = leadRepository.searchLeads(search, pageable);
        } else {
            page = switch (filter) {
                case "completed" -> leadRepository.findByPaymentStatusOrderByCreatedAtDesc(
                        PaymentStatus.COMPLETED, pageable);
                case "pending" -> leadRepository.findByPaymentStatusOrderByCreatedAtDesc(
                        PaymentStatus.PENDING, pageable);
                case "high_priority" -> leadRepository.findHighPriorityLeads(pageable);
                default -> leadRepository.findAllByOrderByCreatedAtDesc(pageable);
            };
        }

        List<AdminLeadRecord> records = page.getContent().stream()
                .map(this::toAdminLeadRecord)
                .toList();

        return FetchAdminLeadsResponse.builder()
                .leads(records)
                .total(page.getTotalElements())
                .hasMore(page.hasNext())
                .fetchedAt(OffsetDateTime.now().toString())
                .build();
    }

    private AdminLeadRecord toAdminLeadRecord(Lead lead) {
        DiagnosticSessionSummary sessionSummary = diagnosticSessionRepository
                .findTopByLeadIdOrderByCreatedAtDesc(lead.getId())
                .map(s -> DiagnosticSessionSummary.builder()
                        .sessionId(s.getId().toString())
                        .status(s.getStatus().name())
                        .finalEmployabilityScore(s.getFinalEmployabilityScore())
                        .scoreBand(s.getScoreBand() != null ? s.getScoreBand().name() : null)
                        .completedAt(s.getCompletedAt() != null ? s.getCompletedAt().toString() : null)
                        .build())
                .orElse(null);

        ConsultationSummary consultationSummary = consultationRepository
                .findByLeadId(lead.getId().toString())
                .map(c -> ConsultationSummary.builder()
                        .consultationId(c.getId().toString())
                        .bookingRef(c.getBookingRef())
                        .preferredDate(c.getPreferredDate())
                        .preferredTime(c.getPreferredTime())
                        .status(c.getStatus().name())
                        .createdAt(c.getCreatedAt().toString())
                        .build())
                .orElse(null);

        return AdminLeadRecord.builder()
                .id(lead.getId().toString())
                .name(lead.getName())
                .email(lead.getEmail())
                .phone(lead.getPhone())
                .location(lead.getLocation())
                .jobRole(lead.getJobRole())
                .yearsExperience(lead.getYearsExperience())
                .careerStage(lead.getCareerStage() != null ? lead.getCareerStage().name() : null)
                .industry(lead.getIndustry())
                .linkedinUrl(lead.getLinkedinUrl())
                .paymentStatus(lead.getPaymentStatus().name())
                .finalEmployabilityScore(lead.getFinalEmployabilityScore())
                .scoreBand(lead.getScoreBand() != null ? lead.getScoreBand().name() : null)
                .crmTags(lead.getCrmTags())
                .createdAt(lead.getCreatedAt().toString())
                .diagnosticSession(sessionSummary)
                .consultation(consultationSummary)
                .build();
    }
}
