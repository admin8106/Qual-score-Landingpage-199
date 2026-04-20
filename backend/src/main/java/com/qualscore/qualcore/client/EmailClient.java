package com.qualscore.qualcore.client;

import com.qualscore.qualcore.email.EmailProvider;
import com.qualscore.qualcore.email.EmailSendRequest;
import com.qualscore.qualcore.email.EmailSendResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Thin façade over {@link EmailProvider} for legacy call sites.
 *
 * New code should inject {@link com.qualscore.qualcore.email.EmailNotificationService}
 * directly, which handles idempotency, branded HTML templates, delivery-status tracking,
 * and event row persistence.
 * This class exists so that any remaining direct-client call sites compile without change.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailClient {

    private final EmailProvider emailProvider;

    public boolean sendEmail(String to, String subject, String htmlBody) {
        EmailSendRequest request = EmailSendRequest.of(to, null, subject, htmlBody, null);
        EmailSendResult result = emailProvider.send(request);
        if (!result.success()) {
            log.warn("[EmailClient] Send failed to={} subject='{}' error={}",
                    to, subject, result.errorMessage());
        }
        return result.success();
    }

    public boolean sendPaymentConfirmation(String to, String candidateName, String orderRef) {
        String subject = "Payment Confirmed - Your Employability Diagnostic is Ready";
        String html = "<p>Hi %s,</p><p>Your payment for the QualScore Employability Diagnostic has been confirmed (Ref: %s).</p>"
                .formatted(candidateName, orderRef);
        return sendEmail(to, subject, html);
    }

    public boolean sendReportReady(String to, String candidateName, double score, String reportLink) {
        String subject = "Your Employability Diagnostic Report is Ready";
        String html = "<p>Hi %s,</p><p>Your report is ready. Your overall score is <strong>%.1f/10</strong>.</p><p><a href='%s'>View Report</a></p>"
                .formatted(candidateName, score, reportLink);
        return sendEmail(to, subject, html);
    }

    public boolean sendConsultationConfirmation(String to, String candidateName,
                                                String bookingRef, String date, String time) {
        String subject = "Consultation Booking Confirmed - " + bookingRef;
        String html = "<p>Hi %s,</p><p>Your consultation is confirmed for %s at %s.</p><p>Booking Ref: <strong>%s</strong></p>"
                .formatted(candidateName, date, time, bookingRef);
        return sendEmail(to, subject, html);
    }
}
