package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.notification.NotificationTemplateRegistry;
import com.qualscore.qualcore.repository.ConsultationBookingRepository;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.repository.DiagnosticScoreRepository;
import com.qualscore.qualcore.repository.PaymentTransactionRepository;
import com.qualscore.qualcore.service.AutomationTriggerService;
import com.qualscore.qualcore.service.CommunicationEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Implements all automation triggers for the QualScore funnel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Pattern for each trigger:
 *   1. Load supporting entities via loadContext()
 *   2. Dispatch CRM push (WebhookCrmProvider or stub)
 *   3. Build token-substitution param map
 *   4. Dispatch WhatsApp + Email via CommunicationEventService
 *   5. For HIGH_PRIORITY: fire internal alert + CRM push
 *
 * All dispatches use PROPAGATION.REQUIRES_NEW — each channel commits
 * independently. A CRM or notification failure never breaks the
 * diagnostic/report/booking flow.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutomationTriggerServiceImpl implements AutomationTriggerService {

    @Value("${app.base-url:https://app.qualscore.in}")
    private String baseUrl;

    private final CommunicationEventService communicationEventService;

    private final DiagnosticScoreRepository     diagnosticScoreRepository;
    private final DiagnosticReportRepository    diagnosticReportRepository;
    private final ConsultationBookingRepository consultationBookingRepository;
    private final PaymentTransactionRepository  paymentTransactionRepository;

    @Override
    public void onReportGenerated(CandidateProfile candidate) {
        log.info("[Automation] REPORT_GENERATED triggered for candidateCode={}", candidate.getCandidateCode());

        Context ctx = loadContext(candidate);

        communicationEventService.dispatchCrm(candidate, EventType.REPORT_GENERATED,
                ctx.score(), ctx.report(), ctx.booking(), ctx.payments());

        Map<String, String> params = buildBaseParams(candidate, ctx.score());
        params.put("REPORT_LINK", reportLink(candidate.getCandidateCode()));

        communicationEventService.dispatchWhatsApp(
                candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_WA_REPORT_READY, params);

        communicationEventService.dispatchEmail(
                candidate, EventType.REPORT_GENERATED,
                NotificationTemplateRegistry.TMPL_EMAIL_REPORT_READY, params);

        ctx.score().ifPresent(score -> {
            if (isHighPriority(score.getFinalEmployabilityScore())) {
                onHighPriorityLead(candidate);
            }
        });
    }

    @Override
    public void onReportViewed(CandidateProfile candidate) {
        log.info("[Automation] REPORT_VIEWED triggered for candidateCode={}", candidate.getCandidateCode());

        Context ctx = loadContext(candidate);

        boolean isNonStrongBand = ctx.score()
                .map(s -> s.getBandLabel() != null && !s.getBandLabel().equalsIgnoreCase("STRONG"))
                .orElse(true);

        if (!isNonStrongBand) {
            log.info("[Automation] REPORT_VIEWED skipping nudge — band is STRONG for candidateCode={}",
                    candidate.getCandidateCode());
            return;
        }

        Map<String, String> params = buildBaseParams(candidate, ctx.score());
        params.put("CONSULTATION_LINK", consultationLink(candidate.getCandidateCode()));

        communicationEventService.dispatchWhatsApp(
                candidate, EventType.REPORT_VIEWED,
                NotificationTemplateRegistry.TMPL_WA_CONSULTATION_NUDGE, params);

        communicationEventService.dispatchEmail(
                candidate, EventType.REPORT_VIEWED,
                NotificationTemplateRegistry.TMPL_EMAIL_PROFILE_NOT_SHORTLISTED, params);
    }

    @Override
    public void onConsultationCtaClicked(CandidateProfile candidate) {
        log.info("[Automation] CONSULTATION_CTA_CLICKED triggered for candidateCode={}", candidate.getCandidateCode());

        Context ctx = loadContext(candidate);
        Map<String, String> params = buildBaseParams(candidate, ctx.score());
        params.put("CONSULTATION_LINK", consultationLink(candidate.getCandidateCode()));

        communicationEventService.dispatchEmail(
                candidate, EventType.CONSULTATION_CTA_CLICKED,
                NotificationTemplateRegistry.TMPL_EMAIL_CONSULTATION_URGENCY, params);
    }

    @Override
    public void onConsultationBooked(CandidateProfile candidate,
                                     String bookingRef,
                                     String preferredDate,
                                     String preferredTime) {
        log.info("[Automation] CONSULTATION_BOOKED triggered for candidateCode={} ref={}",
                candidate.getCandidateCode(), bookingRef);

        Context ctx = loadContext(candidate);

        communicationEventService.dispatchCrm(candidate, EventType.CONSULTATION_BOOKED,
                ctx.score(), ctx.report(), ctx.booking(), ctx.payments());

        Map<String, String> params = buildBaseParams(candidate, ctx.score());
        params.put("BOOKING_REF", bookingRef);
        params.put("DATE", preferredDate);
        params.put("TIME", preferredTime);

        communicationEventService.dispatchWhatsApp(
                candidate, EventType.CONSULTATION_BOOKED,
                NotificationTemplateRegistry.TMPL_WA_BOOKING_CONFIRMED, params);

        communicationEventService.dispatchEmail(
                candidate, EventType.CONSULTATION_BOOKED,
                NotificationTemplateRegistry.TMPL_EMAIL_BOOKING_CONFIRMED, params);
    }

    @Override
    public void onHighPriorityLead(CandidateProfile candidate) {
        log.warn("[Automation] HIGH_PRIORITY_LEAD_IDENTIFIED for candidateCode={}", candidate.getCandidateCode());

        Context ctx = loadContext(candidate);

        communicationEventService.dispatchCrm(candidate, EventType.HIGH_PRIORITY_LEAD_IDENTIFIED,
                ctx.score(), ctx.report(), ctx.booking(), ctx.payments());

        Map<String, String> params = buildBaseParams(candidate, ctx.score());
        String tags = ctx.score()
                .map(s -> s.getTagsJson() != null ? s.getTagsJson() : "[]")
                .orElse("[]");
        params.put("TAGS", tags);

        communicationEventService.dispatchInternalAlert(
                candidate, EventType.HIGH_PRIORITY_LEAD_IDENTIFIED,
                NotificationTemplateRegistry.TMPL_INTERNAL_HIGH_PRIORITY_ALERT, params);
    }

    private Context loadContext(CandidateProfile candidate) {
        Optional<DiagnosticScore> score       = diagnosticScoreRepository.findByCandidateProfileId(candidate.getId());
        Optional<DiagnosticReport> report     = diagnosticReportRepository.findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());
        Optional<ConsultationBooking> booking = consultationBookingRepository.findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());
        List<PaymentTransaction> payments     = paymentTransactionRepository.findByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());
        return new Context(score, report, booking, payments);
    }

    private HashMap<String, String> buildBaseParams(CandidateProfile candidate,
                                                    Optional<DiagnosticScore> scoreOpt) {
        HashMap<String, String> params = new HashMap<>();
        params.put("NAME", candidate.getFullName());
        scoreOpt.ifPresent(score -> {
            if (score.getFinalEmployabilityScore() != null) {
                params.put("SCORE", score.getFinalEmployabilityScore().toPlainString());
            }
            if (score.getBandLabel() != null) {
                params.put("BAND", score.getBandLabel());
            }
        });
        return params;
    }

    private boolean isHighPriority(BigDecimal score) {
        return score != null && score.compareTo(BigDecimal.valueOf(5.0)) < 0;
    }

    private String reportLink(String candidateCode) {
        return baseUrl + "/report/" + candidateCode;
    }

    private String consultationLink(String candidateCode) {
        return baseUrl + "/booking/" + candidateCode;
    }

    private record Context(
            Optional<DiagnosticScore> score,
            Optional<DiagnosticReport> report,
            Optional<ConsultationBooking> booking,
            List<PaymentTransaction> payments
    ) {}
}
