package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Response for GET /api/v1/consultations/{candidateReference}
 * Returns all bookings for the candidate, most recent first.
 */
@Data
@Builder
public class ConsultationListResponse {

    private String candidateReference;
    private List<ConsultationResponse> bookings;
    private int total;
}
