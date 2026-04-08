package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.crm.CrmNotificationService;
import com.qualscore.qualcore.dto.response.CommunicationEventResponse;
import com.qualscore.qualcore.email.EmailNotificationService;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.mapper.CommunicationEventMapper;
import com.qualscore.qualcore.notification.NotificationTemplate;
import com.qualscore.qualcore.notification.NotificationTemplateRegistry;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.CommunicationEventRepository;
import com.qualscore.qualcore.repository.DiagnosticScoreRepository;
import com.qualscore.qualcore.service.CommunicationEventService;
import com.qualscore.qualcore.whatsapp.WhatsAppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Dispatches communication events across all channels.
 *
 * WhatsApp → {@link WhatsAppNotificationService}
 *   Real Meta Cloud API sends, idempotency, PENDING → SENT/FAILED row persistence.
 *
 * Email → {@link EmailNotificationService}
 *   Resend-backed branded HTML + plain-text sends with idempotency and row persistence.
 *
 * CRM → {@link CrmNotificationService}
 *   Webhook (or stub) push of enriched lead payload; idempotency and FAILED isolation.
 *
 * Internal → log stub (future: Slack webhook)
 *
 * PROPAGATION.REQUIRES_NEW on every method: each channel commits independently;
 * a CRM failure never rolls back a WhatsApp or email event.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunicationEventServiceImpl implements CommunicationEventService {

    @Value("${app.base-url:https://app.qualscore.in}")
    private String baseUrl;

    private final CommunicationEventRepository communicationEventRepository;
    private final NotificationTemplateRegistry templateRegistry;
    private final WhatsAppNotificationService whatsAppNotificationService;
    private final EmailNotificationService emailNotificationService;
    private final CrmNotificationService crmNotificationService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final DiagnosticScoreRepository diagnosticScoreRepository;
    private final CommunicationEventMapper communicationEventMapper;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchWhatsApp(CandidateProfile candidate,
                                 EventType eventType,
                                 String templateCode,
                                 Map<String, String> params) {
        switch (templateCode) {
            case NotificationTemplateRegistry.TMPL_WA_REPORT_READY ->
                    whatsAppNotificationService.sendReportReady(candidate, params);
            case NotificationTemplateRegistry.TMPL_WA_CONSULTATION_NUDGE ->
                    whatsAppNotificationService.sendConsultationNudge(candidate, params);
            case NotificationTemplateRegistry.TMPL_WA_BOOKING_CONFIRMED ->
                    whatsAppNotificationService.sendBookingConfirmation(candidate, params);
            default -> {
                log.warn("[CommEvent] Unknown WhatsApp templateCode={} for candidateCode={}",
                        templateCode, candidate.getCandidateCode());
                dispatchStub(candidate, eventType, ChannelType.WHATSAPP, templateCode, params);
            }
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchEmail(CandidateProfile candidate,
                              EventType eventType,
                              String templateCode,
                              Map<String, String> params) {
        switch (templateCode) {
            case NotificationTemplateRegistry.TMPL_EMAIL_REPORT_READY ->
                    emailNotificationService.sendReportReady(candidate, params);
            case NotificationTemplateRegistry.TMPL_EMAIL_PROFILE_NOT_SHORTLISTED ->
                    emailNotificationService.sendProfileNotShortlisted(candidate, params);
            case NotificationTemplateRegistry.TMPL_EMAIL_CONSULTATION_URGENCY ->
                    emailNotificationService.sendConsultationUrgency(candidate, params);
            case NotificationTemplateRegistry.TMPL_EMAIL_BOOKING_CONFIRMED ->
                    emailNotificationService.sendBookingConfirmation(candidate, params);
            default -> {
                log.warn("[CommEvent] Unknown email templateCode={} for candidateCode={}",
                        templateCode, candidate.getCandidateCode());
                dispatchStub(candidate, eventType, ChannelType.EMAIL, templateCode, params);
            }
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchCrm(CandidateProfile candidate,
                            EventType eventType,
                            Optional<DiagnosticScore> score,
                            Optional<DiagnosticReport> report,
                            Optional<ConsultationBooking> booking,
                            List<PaymentTransaction> payments) {
        switch (eventType) {
            case REPORT_GENERATED ->
                    crmNotificationService.pushReportGenerated(candidate, score, report, booking, payments);
            case HIGH_PRIORITY_LEAD_IDENTIFIED ->
                    crmNotificationService.pushHighPriorityLead(candidate, score, report, booking, payments);
            case CONSULTATION_BOOKED ->
                    crmNotificationService.pushConsultationBooked(candidate, score, report, booking, payments);
            default ->
                    log.info("[CommEvent] No CRM handler for eventType={} candidateCode={} — skipping",
                            eventType, candidate.getCandidateCode());
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchInternalAlert(CandidateProfile candidate,
                                      EventType eventType,
                                      String templateCode,
                                      Map<String, String> params) {
        dispatchStub(candidate, eventType, ChannelType.INTERNAL, templateCode, params);
    }

    private void dispatchStub(CandidateProfile candidate,
                               EventType eventType,
                               ChannelType channel,
                               String templateCode,
                               Map<String, String> params) {
        Optional<NotificationTemplate> templateOpt = templateRegistry.findByCode(templateCode);

        String resolvedBody;
        if (templateOpt.isPresent()) {
            resolvedBody = renderTemplate(templateOpt.get().bodyTemplate(), params);
        } else {
            log.warn("[CommEvent] Template not found: code={}", templateCode);
            resolvedBody = params != null ? params.toString() : "";
        }

        DeliveryStatus stubStatus = (channel == ChannelType.INTERNAL) ? DeliveryStatus.SKIPPED : DeliveryStatus.SENT;
        String stubNote = (channel == ChannelType.INTERNAL)
                ? "Internal alert channel not yet connected (Slack/webhook stub)"
                : null;

        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(channel)
                .templateCode(templateCode)
                .payloadJson(resolvedBody)
                .deliveryStatus(stubStatus)
                .errorMessage(stubNote)
                .build();

        communicationEventRepository.save(event);

        log.info("[{} STUB] {} | candidateCode={} | template={} | status={} | body={}",
                channel, eventType, candidate.getCandidateCode(), templateCode, stubStatus, resolvedBody);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resendReportNotifications(String candidateCode, Map<String, String> params) {
        CandidateProfile candidate = candidateProfileRepository
                .findByCandidateCode(candidateCode)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateCode));

        Map<String, String> resolvedParams = buildResendParams(candidate, params);

        log.info("[CommEvent] Admin-triggered resend for candidateCode={}", candidateCode);

        whatsAppNotificationService.resend(candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_WA_REPORT_READY, resolvedParams);

        emailNotificationService.resend(candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_EMAIL_REPORT_READY, resolvedParams);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommunicationEventResponse> getEventsForCandidate(UUID candidateProfileId) {
        return communicationEventRepository
                .findByCandidateProfileIdOrderByCreatedAtDesc(candidateProfileId)
                .stream()
                .map(communicationEventMapper::toResponse)
                .toList();
    }

    private Map<String, String> buildResendParams(CandidateProfile candidate, Map<String, String> extraParams) {
        Map<String, String> params = new HashMap<>();
        if (extraParams != null) params.putAll(extraParams);
        params.putIfAbsent("NAME", candidate.getFullName());
        params.putIfAbsent("REPORT_LINK", baseUrl + "/report/" + candidate.getCandidateCode());
        diagnosticScoreRepository.findByCandidateProfileId(candidate.getId()).ifPresent(score -> {
            if (score.getFinalEmployabilityScore() != null) {
                params.putIfAbsent("SCORE", score.getFinalEmployabilityScore().toPlainString());
            }
            if (score.getBandLabel() != null) {
                params.putIfAbsent("BAND", score.getBandLabel());
            }
        });
        return params;
    }

    private String renderTemplate(String template, Map<String, String> params) {
        if (params == null || params.isEmpty()) return template;
        String result = template;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            result = result.replace("[" + entry.getKey() + "]",
                    entry.getValue() != null ? entry.getValue() : "");
        }
        return result;
    }
}
