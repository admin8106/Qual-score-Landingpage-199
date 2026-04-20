package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.dto.request.CreateConsultationRequest;
import com.qualscore.qualcore.dto.response.ConsultationListResponse;
import com.qualscore.qualcore.dto.response.ConsultationResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.enums.BookingStatus;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.ConsultationBookingRepository;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.service.ConsultationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Implementation of ConsultationService for POST /api/v1/consultations
 * and GET /api/v1/consultations/{candidateReference}.
 *
 * ─────────────────────────────────────────────────────────
 * Create booking rules:
 *   1. Candidate must exist (candidateCode lookup) — 404 if not found
 *   2. If no report exists, log a warning but do NOT block the booking
 *   3. If a REQUESTED booking already exists for this candidate, reject with 409
 *      (A candidate may book again once their prior booking is CONFIRMED or CANCELLED)
 *   4. Persist ConsultationBooking with status = REQUESTED
 *
 * Duplicate guard logic:
 *   Duplicate = same candidate has an existing booking in REQUESTED state.
 *   CONFIRMED, CANCELLED, or COMPLETED bookings do not block new ones.
 *
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationServiceImpl implements ConsultationService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final ConsultationBookingRepository consultationBookingRepository;
    private final DiagnosticReportRepository diagnosticReportRepository;

    @Override
    @Transactional
    public ConsultationResponse createBooking(CreateConsultationRequest request) {
        String candidateRef = request.getCandidateReference();

        CandidateProfile candidate = candidateProfileRepository
                .findByCandidateCode(candidateRef)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateRef));

        boolean reportExists = diagnosticReportRepository.existsByCandidateProfileId(candidate.getId());
        if (!reportExists) {
            log.warn("[Consultation] Booking created before report generation: candidateCode={}", candidateRef);
        }

        Optional<ConsultationBooking> pendingBooking = consultationBookingRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId())
                .filter(b -> b.getBookingStatus() == BookingStatus.REQUESTED);

        if (pendingBooking.isPresent()) {
            throw new BusinessException(
                    "BOOKING_ALREADY_PENDING",
                    "A consultation booking is already pending for this candidate. " +
                    "Please wait for it to be confirmed or cancelled before submitting a new request.",
                    HttpStatus.CONFLICT
            );
        }

        ConsultationBooking booking = ConsultationBooking.builder()
                .candidateProfile(candidate)
                .preferredDate(request.getPreferredDate())
                .preferredTime(request.getPreferredTime())
                .notes(request.getNotes())
                .bookingStatus(BookingStatus.REQUESTED)
                .build();

        booking = consultationBookingRepository.save(booking);
        log.info("[Consultation] Booking created: id={}, candidateCode={}, date={}, time={}",
                booking.getId(), candidateRef, request.getPreferredDate(), request.getPreferredTime());

        return toResponse(booking, candidateRef);
    }

    @Override
    @Transactional(readOnly = true)
    public ConsultationListResponse getBookings(String candidateReference) {
        CandidateProfile candidate = candidateProfileRepository
                .findByCandidateCode(candidateReference)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateReference));

        List<ConsultationBooking> bookings = consultationBookingRepository
                .findByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());

        List<ConsultationResponse> responses = bookings.stream()
                .map(b -> toResponse(b, candidateReference))
                .toList();

        return ConsultationListResponse.builder()
                .candidateReference(candidateReference)
                .bookings(responses)
                .total(responses.size())
                .build();
    }

    private ConsultationResponse toResponse(ConsultationBooking booking, String candidateRef) {
        return ConsultationResponse.builder()
                .bookingId(booking.getId().toString())
                .candidateReference(candidateRef)
                .preferredDate(booking.getPreferredDate())
                .preferredTime(booking.getPreferredTime())
                .notes(booking.getNotes())
                .bookingStatus(booking.getBookingStatus())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}
