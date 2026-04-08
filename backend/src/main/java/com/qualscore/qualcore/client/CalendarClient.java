package com.qualscore.qualcore.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class CalendarClient {

    @Value("${integrations.calendly.api-key:#{null}}")
    private String apiKey;

    @Value("${integrations.calendly.event-type-uri:#{null}}")
    private String eventTypeUri;

    public record BookingResult(String calendarEventId, String meetingLink) {}

    public BookingResult createBooking(String candidateEmail, String candidateName,
                                       String preferredDate, String preferredTime) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[Calendly STUB] Would create booking for {} on {} at {}", candidateName, preferredDate, preferredTime);
            return new BookingResult(null, null);
        }

        log.info("Creating Calendly booking for {} on {} at {}", candidateName, preferredDate, preferredTime);
        return new BookingResult(null, null);
    }
}
