package com.qualscore.qualcore.notification;

import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.EventType;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Central registry of all notification templates used across WhatsApp, Email,
 * and internal channels.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER TOKENS
 *   All body templates use [TOKEN_NAME] syntax.
 *   Substitution is performed at send-time by the channel client.
 *
 * Tokens used:
 *   [NAME]            — candidate full name
 *   [SCORE]           — finalEmployabilityScore (e.g. "6.4")
 *   [REPORT_LINK]     — URL to the report page
 *   [CONSULTATION_LINK] — URL to the consultation booking page
 *   [BAND]            — score band label (e.g. "Developing")
 *   [BOOKING_REF]     — booking reference string
 *   [DATE]            — consultation preferred date
 *   [TIME]            — consultation preferred time
 * ─────────────────────────────────────────────────────────────────────────
 *
 * EMAIL SUBJECTS (production copy):
 *   REPORT_GENERATED  → "Your Employability Diagnostic Report is Ready"
 *   REPORT_VIEWED     → "Why your profile may not be getting shortlisted"
 *   CONSULTATION_CTA  → "Don't ignore this"
 *   CONSULTATION_BOOKED → "Consultation Confirmed – [BOOKING_REF]"
 *
 * WHATSAPP MESSAGES:
 *   WA_REPORT_READY:
 *     "Hi [NAME], your Employability Diagnostic Report is ready.
 *      Your Score: [SCORE]/10. We've identified what's currently affecting
 *      your shortlisting. View your report: [REPORT_LINK]"
 *
 *   WA_CONSULTATION_NUDGE:
 *     "Based on your report, a few key gaps are likely affecting your
 *      interview calls. Book a quick consultation: [CONSULTATION_LINK]"
 * ─────────────────────────────────────────────────────────────────────────
 */
@Component
public class NotificationTemplateRegistry {

    public static final String TMPL_WA_REPORT_READY            = "WA_REPORT_READY";
    public static final String TMPL_WA_CONSULTATION_NUDGE       = "WA_CONSULTATION_NUDGE";
    public static final String TMPL_WA_BOOKING_CONFIRMED        = "WA_BOOKING_CONFIRMED";

    public static final String TMPL_EMAIL_REPORT_READY          = "EMAIL_REPORT_READY";
    public static final String TMPL_EMAIL_PROFILE_NOT_SHORTLISTED = "EMAIL_PROFILE_NOT_SHORTLISTED";
    public static final String TMPL_EMAIL_CONSULTATION_URGENCY  = "EMAIL_CONSULTATION_URGENCY";
    public static final String TMPL_EMAIL_BOOKING_CONFIRMED     = "EMAIL_BOOKING_CONFIRMED";

    public static final String TMPL_INTERNAL_HIGH_PRIORITY_ALERT = "INTERNAL_HIGH_PRIORITY_ALERT";
    public static final String TMPL_CRM_LEAD_SYNC               = "CRM_LEAD_SYNC";

    private static final List<NotificationTemplate> ALL_TEMPLATES = List.of(

        // ── WhatsApp ────────────────────────────────────────────────────
        new NotificationTemplate(
            TMPL_WA_REPORT_READY,
            ChannelType.WHATSAPP,
            EventType.REPORT_GENERATED,
            null,
            "Hi [NAME], your Employability Diagnostic Report is ready. " +
            "Your Score: [SCORE]/10. We've identified what's currently affecting " +
            "your shortlisting. View your report: [REPORT_LINK]"
        ),

        new NotificationTemplate(
            TMPL_WA_CONSULTATION_NUDGE,
            ChannelType.WHATSAPP,
            EventType.REPORT_VIEWED,
            null,
            "Based on your report, a few key gaps are likely affecting your " +
            "interview calls. Book a quick consultation: [CONSULTATION_LINK]"
        ),

        new NotificationTemplate(
            TMPL_WA_BOOKING_CONFIRMED,
            ChannelType.WHATSAPP,
            EventType.CONSULTATION_BOOKED,
            null,
            "Hi [NAME], your consultation is confirmed. " +
            "Booking Ref: [BOOKING_REF] | Date: [DATE] | Time: [TIME]. " +
            "Our advisor will connect with you shortly."
        ),

        // ── Email ───────────────────────────────────────────────────────
        new NotificationTemplate(
            TMPL_EMAIL_REPORT_READY,
            ChannelType.EMAIL,
            EventType.REPORT_GENERATED,
            "Your Employability Diagnostic Report is Ready",
            "Hi [NAME],\n\n" +
            "Your Employability Diagnostic Report is ready.\n" +
            "Your overall score is [SCORE]/10 ([BAND]).\n\n" +
            "We've identified the key gaps that may be affecting your shortlisting rate.\n\n" +
            "View your full report here: [REPORT_LINK]\n\n" +
            "— The QualScore Team"
        ),

        new NotificationTemplate(
            TMPL_EMAIL_PROFILE_NOT_SHORTLISTED,
            ChannelType.EMAIL,
            EventType.REPORT_VIEWED,
            "Why your profile may not be getting shortlisted",
            "Hi [NAME],\n\n" +
            "We noticed you reviewed your report. Your score of [SCORE]/10 suggests " +
            "there are a few structural gaps that could be quietly blocking your callbacks.\n\n" +
            "A 30-minute consultation can help you understand exactly what to fix — " +
            "and in what order.\n\n" +
            "Book here: [CONSULTATION_LINK]\n\n" +
            "— The QualScore Team"
        ),

        new NotificationTemplate(
            TMPL_EMAIL_CONSULTATION_URGENCY,
            ChannelType.EMAIL,
            EventType.CONSULTATION_CTA_CLICKED,
            "Don't ignore this",
            "Hi [NAME],\n\n" +
            "Your diagnostic score of [SCORE]/10 puts you in the [BAND] band. " +
            "Candidates in this range are statistically 2–3x less likely to get shortlisted " +
            "without targeted intervention.\n\n" +
            "Don't leave it to chance. Book a consultation: [CONSULTATION_LINK]\n\n" +
            "— The QualScore Team"
        ),

        new NotificationTemplate(
            TMPL_EMAIL_BOOKING_CONFIRMED,
            ChannelType.EMAIL,
            EventType.CONSULTATION_BOOKED,
            "Consultation Confirmed – [BOOKING_REF]",
            "Hi [NAME],\n\n" +
            "Your consultation has been booked successfully.\n\n" +
            "Booking Reference: [BOOKING_REF]\n" +
            "Preferred Date: [DATE]\n" +
            "Preferred Time: [TIME]\n\n" +
            "Our advisor will reach out to confirm the meeting link before your session.\n\n" +
            "— The QualScore Team"
        ),

        // ── Internal / CRM ─────────────────────────────────────────────
        new NotificationTemplate(
            TMPL_INTERNAL_HIGH_PRIORITY_ALERT,
            ChannelType.INTERNAL,
            EventType.HIGH_PRIORITY_LEAD_IDENTIFIED,
            "High-Priority Lead Detected",
            "HIGH PRIORITY LEAD | Name: [NAME] | Score: [SCORE]/10 | Band: [BAND] | Tags: [TAGS]"
        ),

        new NotificationTemplate(
            TMPL_CRM_LEAD_SYNC,
            ChannelType.CRM,
            EventType.CRM_SYNCED,
            null,
            "CRM sync payload for [NAME] — see payloadJson for full structure"
        )
    );

    private final Map<String, NotificationTemplate> byCode;
    private final Map<EventType, List<NotificationTemplate>> byEvent;

    public NotificationTemplateRegistry() {
        this.byCode = ALL_TEMPLATES.stream()
                .collect(Collectors.toMap(NotificationTemplate::templateCode, Function.identity()));
        this.byEvent = ALL_TEMPLATES.stream()
                .collect(Collectors.groupingBy(NotificationTemplate::triggerEvent));
    }

    public Optional<NotificationTemplate> findByCode(String templateCode) {
        return Optional.ofNullable(byCode.get(templateCode));
    }

    public List<NotificationTemplate> findByEvent(EventType eventType) {
        return byEvent.getOrDefault(eventType, List.of());
    }

    public Collection<NotificationTemplate> all() {
        return ALL_TEMPLATES;
    }
}
