package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.audit.AuditEventType;
import com.qualscore.qualcore.audit.AuditLogService;
import com.qualscore.qualcore.dto.request.BookConsultationRequest;
import com.qualscore.qualcore.dto.response.BookConsultationResponse;
import com.qualscore.qualcore.entity.Consultation;
import com.qualscore.qualcore.enums.ScoreBand;
import com.qualscore.qualcore.repository.ConsultationRepository;
import com.qualscore.qualcore.service.BookingService;
import com.qualscore.qualcore.util.BookingRefGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final ConsultationRepository consultationRepository;
    private final BookingRefGenerator bookingRefGenerator;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public BookConsultationResponse bookConsultation(BookConsultationRequest request) {
        String bookingRef = generateUniqueRef();

        ScoreBand band;
        try {
            band = ScoreBand.valueOf(request.getScoreBand().toUpperCase());
        } catch (IllegalArgumentException e) {
            band = ScoreBand.NEEDS_OPTIMIZATION;
        }

        Consultation consultation = Consultation.builder()
                .leadId(request.getLeadId())
                .sessionId(request.getSessionId())
                .candidateName(request.getCandidateName())
                .candidateEmail(request.getCandidateEmail())
                .candidatePhone(request.getCandidatePhone())
                .jobRole(request.getJobRole())
                .preferredDate(request.getPreferredDate())
                .preferredTime(request.getPreferredTime())
                .notes(request.getNotes() != null ? request.getNotes() : "")
                .employabilityScore(BigDecimal.valueOf(request.getEmployabilityScore()))
                .scoreBand(band)
                .bookingRef(bookingRef)
                .build();

        consultation = consultationRepository.save(consultation);

        auditLogService.success(
                AuditEventType.CONSULTATION_BOOKED,
                request.getCandidateEmail(),
                "Consultation",
                bookingRef,
                Map.of("leadId", request.getLeadId() != null ? request.getLeadId() : "",
                        "date", request.getPreferredDate(),
                        "time", request.getPreferredTime(),
                        "scoreBand", band.name()));

        log.info("Consultation booked: bookingRef={}, leadId={}", bookingRef, request.getLeadId());

        return BookConsultationResponse.builder()
                .bookingRef(bookingRef)
                .confirmedDate(request.getPreferredDate())
                .confirmedTime(request.getPreferredTime())
                .bookedAt(consultation.getCreatedAt().toString())
                .build();
    }

    private String generateUniqueRef() {
        String ref;
        int attempts = 0;
        do {
            ref = bookingRefGenerator.generate();
            attempts++;
        } while (consultationRepository.existsByBookingRef(ref) && attempts < 10);
        return ref;
    }
}
