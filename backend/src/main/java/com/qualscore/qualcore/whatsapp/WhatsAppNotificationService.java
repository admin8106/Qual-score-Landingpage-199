package com.qualscore.qualcore.whatsapp;

import com.qualscore.qualcore.email.EmailNotificationService;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.notification.NotificationTemplate;
import com.qualscore.qualcore.notification.NotificationTemplateRegistry;
import com.qualscore.qualcore.repository.CommunicationEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Sends WhatsApp messages for key funnel events and persists each attempt as
 * a {@link CommunicationEvent} record.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Retry policy
 * ─────────────────────────────────────────────────────────────────────────
 *   On first attempt failure, a second attempt is made immediately.
 *   If both WhatsApp attempts fail for REPORT_GENERATED, the message falls
 *   back to email so the user always receives confirmation of their ₹199 spend.
 *
 *   RETRIED status is persisted on the first event row when a retry has been
 *   made, allowing admin to distinguish "succeeded on retry" from "never tried".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Idempotency
 * ─────────────────────────────────────────────────────────────────────────
 *   Key: candidateCode + "::" + templateCode
 *   SENT/DELIVERED → skip. FAILED → retry. PENDING/RETRIED → skip (in-flight).
 */
@Slf4j
@Service
public class WhatsAppNotificationService {

    private final WhatsAppProvider whatsAppProvider;
    private final NotificationTemplateRegistry templateRegistry;
    private final CommunicationEventRepository communicationEventRepository;
    private final EmailNotificationService emailNotificationService;

    public WhatsAppNotificationService(WhatsAppProvider whatsAppProvider,
                                       NotificationTemplateRegistry templateRegistry,
                                       CommunicationEventRepository communicationEventRepository,
                                       @Lazy EmailNotificationService emailNotificationService) {
        this.whatsAppProvider = whatsAppProvider;
        this.templateRegistry = templateRegistry;
        this.communicationEventRepository = communicationEventRepository;
        this.emailNotificationService = emailNotificationService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendReportReady(CandidateProfile candidate, Map<String, String> params) {
        boolean waSent = send(candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_WA_REPORT_READY, params, true);
        if (!waSent) {
            log.warn("[WhatsApp] Both WA attempts failed for candidateCode={} — falling back to email",
                    candidate.getCandidateCode());
            try {
                emailNotificationService.sendWithFallbackRetry(candidate, EventType.REPORT_GENERATED,
                        NotificationTemplateRegistry.TMPL_EMAIL_REPORT_READY, params, "wa_fallback");
            } catch (Exception ex) {
                log.error("[WhatsApp→Email fallback] Email fallback also failed for candidateCode={}: {}",
                        candidate.getCandidateCode(), ex.getMessage());
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendConsultationNudge(CandidateProfile candidate, Map<String, String> params) {
        send(candidate, EventType.REPORT_VIEWED,
                NotificationTemplateRegistry.TMPL_WA_CONSULTATION_NUDGE, params, false);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendBookingConfirmation(CandidateProfile candidate, Map<String, String> params) {
        send(candidate, EventType.CONSULTATION_BOOKED,
                NotificationTemplateRegistry.TMPL_WA_BOOKING_CONFIRMED, params, false);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resend(CandidateProfile candidate, EventType eventType,
                       String templateCode, Map<String, String> params) {
        String resendKey = candidate.getCandidateCode() + "::" + templateCode + "::resend";
        doSend(candidate, eventType, templateCode, params, resendKey);
    }

    private boolean send(CandidateProfile candidate,
                         EventType eventType,
                         String templateCode,
                         Map<String, String> params,
                         boolean retryOnce) {

        String phone = candidate.getMobileNumber();

        if (phone == null || phone.isBlank()) {
            log.warn("[WhatsApp] Skipping send — no phone for candidateCode={}", candidate.getCandidateCode());
            persistSkipped(candidate, eventType, templateCode, "No phone number on profile");
            return false;
        }

        String idempotencyKey = candidate.getCandidateCode() + "::" + templateCode;

        Optional<CommunicationEvent> existing =
                communicationEventRepository.findByIdempotencyKey(idempotencyKey);

        if (existing.isPresent()) {
            DeliveryStatus existingStatus = existing.get().getDeliveryStatus();
            if (existingStatus == DeliveryStatus.SENT || existingStatus == DeliveryStatus.DELIVERED) {
                log.info("[WhatsApp] Skipping duplicate send — idempotencyKey={} status={}",
                        idempotencyKey, existingStatus);
                return true;
            }
            if (existingStatus == DeliveryStatus.PENDING || existingStatus == DeliveryStatus.RETRIED) {
                log.info("[WhatsApp] Send already in-flight or retried — idempotencyKey={}", idempotencyKey);
                return false;
            }
        }

        boolean success = doSend(candidate, eventType, templateCode, params, idempotencyKey);

        if (!success && retryOnce) {
            log.warn("[WhatsApp] First attempt failed — retrying once for candidateCode={} template={}",
                    candidate.getCandidateCode(), templateCode);
            markRetried(idempotencyKey);
            String retryKey = idempotencyKey + "::retry1";
            success = doSend(candidate, eventType, templateCode, params, retryKey);
        }

        return success;
    }

    private boolean doSend(CandidateProfile candidate,
                            EventType eventType,
                            String templateCode,
                            Map<String, String> params,
                            String idempotencyKey) {

        Optional<NotificationTemplate> templateOpt = templateRegistry.findByCode(templateCode);
        if (templateOpt.isEmpty()) {
            log.error("[WhatsApp] Template not found: code={}", templateCode);
            persistFailed(candidate, eventType, templateCode, idempotencyKey,
                    null, "Template not found: " + templateCode);
            return false;
        }

        String renderedBody = renderTemplate(templateOpt.get().bodyTemplate(), params);
        List<String> componentValues = extractComponentValues(params, templateOpt.get().bodyTemplate());

        CommunicationEvent event = persistPending(candidate, eventType, templateCode,
                idempotencyKey, renderedBody);

        WhatsAppSendRequest request = WhatsAppSendRequest.of(
                candidate.getMobileNumber(),
                toMetaTemplateName(templateCode),
                componentValues,
                renderedBody
        );

        WhatsAppSendResult result = whatsAppProvider.send(request);

        if (result.success()) {
            event.setDeliveryStatus(DeliveryStatus.SENT);
            event.setProviderMessageId(result.providerMessageId());
            event.setErrorMessage(null);
            log.info("[WhatsApp] SENT candidateCode={} template={} providerMsgId={}",
                    candidate.getCandidateCode(), templateCode, result.providerMessageId());
        } else {
            event.setDeliveryStatus(DeliveryStatus.FAILED);
            event.setErrorMessage(result.errorMessage());
            log.error("[WhatsApp] FAILED candidateCode={} template={} error={}",
                    candidate.getCandidateCode(), templateCode, result.errorMessage());
        }

        communicationEventRepository.save(event);
        return result.success();
    }

    private void markRetried(String idempotencyKey) {
        communicationEventRepository.findByIdempotencyKey(idempotencyKey).ifPresent(event -> {
            event.setDeliveryStatus(DeliveryStatus.RETRIED);
            communicationEventRepository.save(event);
        });
    }

    private CommunicationEvent persistPending(CandidateProfile candidate,
                                               EventType eventType,
                                               String templateCode,
                                               String idempotencyKey,
                                               String renderedBody) {
        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(ChannelType.WHATSAPP)
                .templateCode(templateCode)
                .payloadJson(renderedBody)
                .deliveryStatus(DeliveryStatus.PENDING)
                .idempotencyKey(idempotencyKey)
                .build();
        return communicationEventRepository.save(event);
    }

    private void persistSkipped(CandidateProfile candidate,
                                 EventType eventType,
                                 String templateCode,
                                 String reason) {
        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(ChannelType.WHATSAPP)
                .templateCode(templateCode)
                .payloadJson(reason)
                .deliveryStatus(DeliveryStatus.SKIPPED)
                .build();
        communicationEventRepository.save(event);
    }

    private void persistFailed(CandidateProfile candidate,
                                EventType eventType,
                                String templateCode,
                                String idempotencyKey,
                                String providerMessageId,
                                String errorMessage) {
        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(ChannelType.WHATSAPP)
                .templateCode(templateCode)
                .deliveryStatus(DeliveryStatus.FAILED)
                .idempotencyKey(idempotencyKey)
                .providerMessageId(providerMessageId)
                .errorMessage(errorMessage)
                .build();
        communicationEventRepository.save(event);
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

    private List<String> extractComponentValues(Map<String, String> params, String bodyTemplate) {
        if (params == null || params.isEmpty()) return List.of();
        List<String> values = new ArrayList<>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\[([A-Z_]+)]")
                .matcher(bodyTemplate);
        while (m.find()) {
            String token = m.group(1);
            String value = params.get(token);
            if (value != null) values.add(value);
        }
        return values;
    }

    private String toMetaTemplateName(String templateCode) {
        return templateCode.toLowerCase();
    }
}
