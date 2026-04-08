package com.qualscore.qualcore.client;

import com.qualscore.qualcore.whatsapp.WhatsAppProvider;
import com.qualscore.qualcore.whatsapp.WhatsAppSendRequest;
import com.qualscore.qualcore.whatsapp.WhatsAppSendResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Thin façade over {@link WhatsAppProvider} for legacy call sites.
 *
 * New code should inject {@link com.qualscore.qualcore.whatsapp.WhatsAppNotificationService}
 * directly, which handles persistence, idempotency, and delivery-status tracking.
 * This class exists so that any remaining direct-client usages compile without change.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsAppClient {

    private final WhatsAppProvider whatsAppProvider;

    public boolean sendTemplate(String to, String templateName, Map<String, String> params) {
        List<String> componentValues = params != null ? List.copyOf(params.values()) : List.of();
        String bodyText = params != null ? params.toString() : "";

        WhatsAppSendRequest request = WhatsAppSendRequest.of(to, templateName, componentValues, bodyText);
        WhatsAppSendResult result = whatsAppProvider.send(request);

        if (!result.success()) {
            log.warn("[WhatsAppClient] Send failed to={} template={} error={}",
                    to, templateName, result.errorMessage());
        }
        return result.success();
    }

    public boolean sendReportNotification(String phone, String candidateName, double score, String reportLink) {
        return sendTemplate(phone, "wa_report_ready", Map.of(
                "NAME", candidateName,
                "SCORE", String.format("%.1f", score),
                "REPORT_LINK", reportLink
        ));
    }

    public boolean sendConsultationConfirmation(String phone, String candidateName,
                                                String bookingRef, String date, String time) {
        return sendTemplate(phone, "wa_booking_confirmed", Map.of(
                "NAME", candidateName,
                "BOOKING_REF", bookingRef,
                "DATE", date,
                "TIME", time
        ));
    }
}
