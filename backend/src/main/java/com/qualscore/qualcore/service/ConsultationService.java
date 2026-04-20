package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.CreateConsultationRequest;
import com.qualscore.qualcore.dto.response.ConsultationListResponse;
import com.qualscore.qualcore.dto.response.ConsultationResponse;

/**
 * Consultation booking service for the v1 API.
 *
 * Contract:
 *   - createBooking: validates candidate existence, warns if no report exists,
 *     prevents blindly duplicated REQUESTED bookings, persists ConsultationBooking.
 *   - getBookings: returns all ConsultationBooking records for a candidate, most recent first.
 */
public interface ConsultationService {

    ConsultationResponse createBooking(CreateConsultationRequest request);

    ConsultationListResponse getBookings(String candidateReference);
}
