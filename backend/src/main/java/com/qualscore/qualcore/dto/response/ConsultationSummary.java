package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsultationSummary {
    private String consultationId;
    private String bookingRef;
    private String preferredDate;
    private String preferredTime;
    private String status;
    private String createdAt;
}
