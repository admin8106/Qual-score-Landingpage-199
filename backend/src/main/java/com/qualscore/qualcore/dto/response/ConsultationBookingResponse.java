package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ConsultationBookingResponse {

    private UUID id;
    private String candidateCode;
    private String preferredDate;
    private String preferredTime;
    private String notes;
    private BookingStatus bookingStatus;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
