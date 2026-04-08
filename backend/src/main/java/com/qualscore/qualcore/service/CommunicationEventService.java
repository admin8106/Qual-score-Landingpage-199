package com.qualscore.qualcore.service;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.EventType;

import com.qualscore.qualcore.dto.response.CommunicationEventResponse;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for dispatching communication events across all channels.
 *
 * WhatsApp  → {@link com.qualscore.qualcore.whatsapp.WhatsAppNotificationService}
 * Email     → {@link com.qualscore.qualcore.email.EmailNotificationService}
 * CRM       → {@link com.qualscore.qualcore.crm.CrmNotificationService}
 * Internal  → Slack/log stub (future)
 *
 * All methods use PROPAGATION.REQUIRES_NEW so failures in one channel
 * never roll back another channel or the parent business transaction.
 */
public interface CommunicationEventService {

    void dispatchWhatsApp(CandidateProfile candidate,
                          EventType eventType,
                          String templateCode,
                          Map<String, String> params);

    void dispatchEmail(CandidateProfile candidate,
                       EventType eventType,
                       String templateCode,
                       Map<String, String> params);

    /**
     * Push a lead's full diagnostic data to the CRM.
     *
     * All related entities are passed in so that the CRM service can build
     * a complete, enriched payload without additional DB queries.
     */
    void dispatchCrm(CandidateProfile candidate,
                     EventType eventType,
                     Optional<DiagnosticScore> score,
                     Optional<DiagnosticReport> report,
                     Optional<ConsultationBooking> booking,
                     List<PaymentTransaction> payments);

    void dispatchInternalAlert(CandidateProfile candidate,
                               EventType eventType,
                               String templateCode,
                               Map<String, String> params);

    /**
     * Manually resend report-ready notifications (WhatsApp + email) for a candidate.
     * Creates new event rows with a resend suffix so history is preserved.
     */
    void resendReportNotifications(String candidateCode, Map<String, String> params);

    /**
     * Return all communication events for a candidate, newest first.
     */
    List<CommunicationEventResponse> getEventsForCandidate(UUID candidateProfileId);
}
