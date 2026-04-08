package com.qualscore.qualcore.email;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.notification.NotificationTemplate;
import com.qualscore.qualcore.notification.NotificationTemplateRegistry;
import com.qualscore.qualcore.repository.CommunicationEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Sends transactional emails for key funnel events and persists each attempt
 * as a {@link CommunicationEvent} row.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Retry policy
 * ─────────────────────────────────────────────────────────────────────────
 *   Standard sends (sendReportReady, sendBookingConfirmation) retry once on
 *   failure before persisting FAILED. The retry uses a suffixed idempotency
 *   key (::retry1) so the original row is preserved for audit purposes.
 *
 *   sendWithFallbackRetry is called by WhatsAppNotificationService when all
 *   WA attempts have failed — it uses a dedicated idempotency suffix
 *   ("::email::" + templateCode + "::" + suffix) to avoid clashing with a
 *   direct email send that may have already succeeded.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Idempotency
 * ─────────────────────────────────────────────────────────────────────────
 *   Key: candidateCode + "::email::" + templateCode
 *   SENT/DELIVERED → skip. FAILED → allow retry. PENDING → skip (in-flight).
 *   RETRIED → skip (retry already committed).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final EmailProvider emailProvider;
    private final EmailTemplateRenderer templateRenderer;
    private final NotificationTemplateRegistry templateRegistry;
    private final CommunicationEventRepository communicationEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendReportReady(CandidateProfile candidate, Map<String, String> params) {
        sendWithRetry(candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_EMAIL_REPORT_READY, params);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendProfileNotShortlisted(CandidateProfile candidate, Map<String, String> params) {
        send(candidate, EventType.REPORT_VIEWED,
                NotificationTemplateRegistry.TMPL_EMAIL_PROFILE_NOT_SHORTLISTED, params,
                candidate.getCandidateCode() + "::email::" + NotificationTemplateRegistry.TMPL_EMAIL_PROFILE_NOT_SHORTLISTED);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendConsultationUrgency(CandidateProfile candidate, Map<String, String> params) {
        send(candidate, EventType.CONSULTATION_CTA_CLICKED,
                NotificationTemplateRegistry.TMPL_EMAIL_CONSULTATION_URGENCY, params,
                candidate.getCandidateCode() + "::email::" + NotificationTemplateRegistry.TMPL_EMAIL_CONSULTATION_URGENCY);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendBookingConfirmation(CandidateProfile candidate, Map<String, String> params) {
        sendWithRetry(candidate, EventType.CONSULTATION_BOOKED,
                NotificationTemplateRegistry.TMPL_EMAIL_BOOKING_CONFIRMED, params);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resend(CandidateProfile candidate, EventType eventType,
                       String templateCode, Map<String, String> params) {
        String resendKey = candidate.getCandidateCode() + "::email::" + templateCode + "::resend";
        send(candidate, eventType, templateCode, params, resendKey);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendWithFallbackRetry(CandidateProfile candidate, EventType eventType,
                                      String templateCode, Map<String, String> params,
                                      String suffix) {
        String fallbackKey = candidate.getCandidateCode() + "::email::" + templateCode + "::" + suffix;
        boolean success = send(candidate, eventType, templateCode, params, fallbackKey);
        if (!success) {
            log.warn("[Email] Fallback send failed — retrying once for candidateCode={} template={}",
                    candidate.getCandidateCode(), templateCode);
            markRetried(fallbackKey);
            String retryKey = fallbackKey + "::retry1";
            send(candidate, eventType, templateCode, params, retryKey);
        }
    }

    private void sendWithRetry(CandidateProfile candidate, EventType eventType,
                                String templateCode, Map<String, String> params) {
        String idempotencyKey = candidate.getCandidateCode() + "::email::" + templateCode;
        boolean success = send(candidate, eventType, templateCode, params, idempotencyKey);
        if (!success) {
            log.warn("[Email] First attempt failed — retrying once for candidateCode={} template={}",
                    candidate.getCandidateCode(), templateCode);
            markRetried(idempotencyKey);
            String retryKey = idempotencyKey + "::retry1";
            send(candidate, eventType, templateCode, params, retryKey);
        }
    }

    private boolean send(CandidateProfile candidate,
                         EventType eventType,
                         String templateCode,
                         Map<String, String> params,
                         String idempotencyKey) {

        String email = candidate.getEmail();

        if (email == null || email.isBlank()) {
            log.warn("[Email] Skipping send — no email for candidateCode={}", candidate.getCandidateCode());
            persistSkipped(candidate, eventType, templateCode, "No email on profile");
            return false;
        }

        Optional<CommunicationEvent> existing =
                communicationEventRepository.findByIdempotencyKey(idempotencyKey);

        if (existing.isPresent()) {
            DeliveryStatus existingStatus = existing.get().getDeliveryStatus();
            if (existingStatus == DeliveryStatus.SENT || existingStatus == DeliveryStatus.DELIVERED) {
                log.info("[Email] Skipping duplicate — idempotencyKey={} status={}",
                        idempotencyKey, existingStatus);
                return true;
            }
            if (existingStatus == DeliveryStatus.PENDING || existingStatus == DeliveryStatus.RETRIED) {
                log.info("[Email] Send already in-flight or retried — idempotencyKey={}", idempotencyKey);
                return false;
            }
        }

        Optional<NotificationTemplate> templateOpt = templateRegistry.findByCode(templateCode);
        if (templateOpt.isEmpty()) {
            log.error("[Email] Template not found: code={}", templateCode);
            persistFailed(candidate, eventType, templateCode, idempotencyKey,
                    null, "Template not found: " + templateCode);
            return false;
        }

        NotificationTemplate template = templateOpt.get();
        String subject  = resolveSubject(template, params);
        String htmlBody = templateRenderer.renderHtml(templateCode, params);
        String textBody = templateRenderer.renderText(template.bodyTemplate(), params);

        CommunicationEvent event = persistPending(candidate, eventType, templateCode,
                idempotencyKey, subject);

        EmailSendRequest request = EmailSendRequest.of(
                email,
                candidate.getFullName(),
                subject,
                htmlBody,
                textBody
        );

        EmailSendResult result = emailProvider.send(request);

        if (result.success()) {
            event.setDeliveryStatus(DeliveryStatus.SENT);
            event.setProviderMessageId(result.providerMessageId());
            event.setErrorMessage(null);
            log.info("[Email] SENT candidateCode={} template={} to={} providerMsgId={}",
                    candidate.getCandidateCode(), templateCode, email, result.providerMessageId());
        } else {
            event.setDeliveryStatus(DeliveryStatus.FAILED);
            event.setErrorMessage(result.errorMessage());
            log.error("[Email] FAILED candidateCode={} template={} to={} error={}",
                    candidate.getCandidateCode(), templateCode, email, result.errorMessage());
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

    private String resolveSubject(NotificationTemplate template, Map<String, String> params) {
        String subject = template.subjectLine();
        if (subject == null) return "Message from QualScore";
        if (params != null) {
            for (Map.Entry<String, String> entry : params.entrySet()) {
                subject = subject.replace("[" + entry.getKey() + "]",
                        entry.getValue() != null ? entry.getValue() : "");
            }
        }
        return subject;
    }

    private CommunicationEvent persistPending(CandidateProfile candidate,
                                               EventType eventType,
                                               String templateCode,
                                               String idempotencyKey,
                                               String subject) {
        CommunicationEvent event = CommunicationEvent.builder()
                .candidateProfile(candidate)
                .eventType(eventType)
                .channelType(ChannelType.EMAIL)
                .templateCode(templateCode)
                .payloadJson(subject)
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
                .channelType(ChannelType.EMAIL)
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
                .channelType(ChannelType.EMAIL)
                .templateCode(templateCode)
                .deliveryStatus(DeliveryStatus.FAILED)
                .idempotencyKey(idempotencyKey)
                .providerMessageId(providerMessageId)
                .errorMessage(errorMessage)
                .build();
        communicationEventRepository.save(event);
    }
}
