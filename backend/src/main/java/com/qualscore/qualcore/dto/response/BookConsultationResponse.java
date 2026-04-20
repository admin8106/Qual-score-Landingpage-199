package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookConsultationResponse {
    private String bookingRef;
    private String confirmedDate;
    private String confirmedTime;
    private String meetingLink;
    private String calendarEventId;
    private String bookedAt;
}
