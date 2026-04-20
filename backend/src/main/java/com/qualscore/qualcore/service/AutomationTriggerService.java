package com.qualscore.qualcore.service;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.enums.EventType;

/**
 * High-level automation trigger service.
 *
 * Each public method maps to a business event in the QualScore funnel.
 * Internal implementation aggregates required data, builds the CRM payload,
 * resolves templates, and delegates to {@link CommunicationEventService}
 * to persist and (eventually) dispatch.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Call sites:
 *   onReportGenerated       → DiagnosticAnalysisOrchestrationService
 *   onReportViewed          → ReportController (GET report endpoint)
 *   onConsultationCtaClicked → future analytics event endpoint
 *   onConsultationBooked    → ConsultationServiceImpl
 *   onHighPriorityLead      → called internally after tag derivation
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Future wiring:
 *   - WhatsApp send: wire WhatsAppClient inside CommunicationEventServiceImpl
 *   - Email send: wire EmailClient inside CommunicationEventServiceImpl
 *   - CRM webhook: wire CrmClient inside CommunicationEventServiceImpl.dispatchCrm
 *   - Slack alert: wire SlackClient inside AutomationTriggerServiceImpl.onHighPriorityLead
 */
public interface AutomationTriggerService {

    void onReportGenerated(CandidateProfile candidate);

    void onReportViewed(CandidateProfile candidate);

    void onConsultationCtaClicked(CandidateProfile candidate);

    void onConsultationBooked(CandidateProfile candidate, String bookingRef, String preferredDate, String preferredTime);

    void onHighPriorityLead(CandidateProfile candidate);
}
