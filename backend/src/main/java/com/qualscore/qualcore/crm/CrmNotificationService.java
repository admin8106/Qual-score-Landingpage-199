package com.qualscore.qualcore.crm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.notification.CrmPayload;
import com.qualscore.qualcore.notification.CrmPayloadBuilder;
import com.qualscore.qualcore.repository.CommunicationEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Pushes lead and diagnostic data to the configured CRM provider and persists
 * each attempt as a {@link CommunicationEvent} row for auditability and replay.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Trigger points
 * ─────────────────────────────────────────────────────────────────────────
 *   REPORT_GENERATED
 *     Pushes candidate profile + score + band + tags + payment/report status
 *
 *   HIGH_PRIORITY_LEAD_IDENTIFIED
 *     Same payload but highlights the HIGH_PRIORITY flag and tag list for
 *     immediate BD team routing
 *
 *   CONSULTATION_BOOKED
 *     Adds booking reference, preferred date/time to the standard payload
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Idempotency
 * ─────────────────────────────────────────────────────────────────────────
 *   Key: candidateCode + "::crm::" + eventType
 *   SENT/DELIVERED → skip (already synced)
 *   PENDING        → skip (in-flight)
 *   FAILED         → retry (provider may now be available)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Failure isolation
 * ─────────────────────────────────────────────────────────────────────────
 *   CRM push failures are fully caught and logged. They NEVER propagate to
 *   the calling diagnostic/report/booking transaction. The calling service
 *   uses PROPAGATION.REQUIRES_NEW so a CRM failure rolls back only its own
 *   communication_events row (setting it to FAILED) without affecting any
 *   parent transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrmNotificationService {

    private static final String TMPL_CRM_LEAD_SYNC = "CRM_LEAD_SYNC";

    private final CrmProvider crmProvider;
    private final CrmPayloadBuilder crmPayloadBuilder;
    private final CommunicationEventRepository communicationEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void pushReportGenerated(CandidateProfile candidate,
                                    Optional<DiagnosticScore> score,
                                    Optional<DiagnosticReport> report,
                                    Optional<ConsultationBooking> booking,
                                    List<PaymentTransaction> payments) {
        push(candidate, EventType.REPORT_GENERATED, score, report, booking, payments);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void pushHighPriorityLead(CandidateProfile candidate,
                                     Optional<DiagnosticScore> score,
                                     Optional<DiagnosticReport> report,
                                     Optional<ConsultationBooking> booking,
                                     List<PaymentTransaction> payments) {
        push(candidate, EventType.HIGH_PRIORITY_LEAD_IDENTIFIED, score, report, booking, payments);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void pushConsultationBooked(CandidateProfile candidate,
                                       Optional<DiagnosticScore> score,
                                       Optional<DiagnosticReport> report,
                                       Optional<ConsultationBooking> booking,
                                       List<PaymentTransaction> payments) {
        push(candidate, EventType.CONSULTATION_BOOKED, score, report, booking, payments);
    }

    private void push(CandidateProfile candidate,
                      EventType eventType,
                      Optional<DiagnosticScore> score,
                      Optional<DiagnosticReport> report,
                      Optional<ConsultationBooking> booking,
                      List<PaymentTransaction> payments) {

        String idempotencyKey = candidate.getCandidateCode() + "::crm::" + eventType.name();

        Optional<CommunicationEvent> existing =
                communicationEventRepository.findByIdempotencyKey(idempotencyKey);

        if (existing.isPresent()) {
            DeliveryStatus status = existing.get().getDeliveryStatus();
            if (status == DeliveryStatus.SENT || status == DeliveryStatus.DELIVERED) {
                log.info("[CRM] Skipping duplicate push — idempotencyKey={} status={}", idempotencyKey, status);
                return;
            }
            if (status == DeliveryStatus.PENDING) {
                log.info("[CRM] Push already in-flight — idempotencyKey={}", idempotencyKey);
                return;
            }
        }

        CrmPayload payload = crmPayloadBuilder.build(candidate, score, report, booking, payments, eventType);
        String payloadJson = crmPayloadBuilder.toJson(payload);

        CommunicationEvent event = persistPending(candidate, eventType, idempotencyKey, payloadJson);

        try {
            CrmPushRequest request = CrmPushRequest.of(idempotencyKey, payload);
            CrmPushResult result = crmProvider.push(request);

            if (result.success()) {
                event.setDeliveryStatus(DeliveryStatus.SENT);
                event.setProviderMessageId(result.providerRecordId());
                event.setErrorMessage(null);
                log.info("[CRM] PUSHED candidateCode={} event={} provider={} recordId={}",
                        candidate.getCandidateCode(), eventType,
                        crmProvider.providerName(), result.providerRecordId());
            } else {
                event.setDeliveryStatus(DeliveryStatus.FAILED);
                event.setErrorMessage(result.errorMessage());
                log.error("[CRM] FAILED candidateCode={} event={} provider={} error={}",
                        candidate.getCandidateCode(), eventType,
                        crmProvider.providerName(), result.errorMessage());
            }
        } catch (Exception ex) {
            event.setDeliveryStatus(DeliveryStatus.FAILED);
            event.setErrorMessage(truncate(ex.getMessage(), 400));
            log.error("[CRM] Unexpected failure pushing candidateCode={} event={}: {}",
                    candidate.getCandidateCode(), eventType, ex.getMessage(), ex);
        }

        communicationEventRepository.save(event);
    }

    private CommunicationEvent persistPending(CandidateProfile candidate,
                                               EventType eventType,
                                               String idempotencyKey,
                                               String payloadJson) {
        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(ChannelType.CRM)
                .templateCode(TMPL_CRM_LEAD_SYNC)
                .payloadJson(payloadJson)
                .deliveryStatus(DeliveryStatus.PENDING)
                .idempotencyKey(idempotencyKey)
                .build();
        return communicationEventRepository.save(event);
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
