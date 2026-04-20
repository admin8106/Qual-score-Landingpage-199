package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * Response for a single consultation booking record.
 * Used in both POST /api/v1/consultations (create) and
 * GET /api/v1/consultations/{candidateReference} (fetch).
 */
@Data
@Builder
public class ConsultationResponse {

    private String bookingId;
    private String candidateReference;
    private String preferredDate;
    private String preferredTime;
    private String notes;
    private BookingStatus bookingStatus;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
