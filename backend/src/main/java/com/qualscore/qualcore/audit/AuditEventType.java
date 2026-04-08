package com.qualscore.qualcore.audit;

/**
 * Canonical set of auditable events in the QualScore platform.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Naming convention:  DOMAIN_ACTION  (e.g. PAYMENT_INITIATED)
 *
 * PAYMENT events
 *   PAYMENT_INITIATED     — new transaction record created
 *   PAYMENT_VERIFIED      — signature verified, status → VERIFIED
 *   PAYMENT_FAILED        — signature invalid, status → FAILED
 *   WEBHOOK_RECEIVED      — server-to-server webhook event received
 *   WEBHOOK_DUPLICATE     — idempotent duplicate webhook detected and skipped
 *   WEBHOOK_INVALID       — webhook signature verification failed
 *
 * DIAGNOSTIC events
 *   DIAGNOSTIC_RESPONSES_SAVED   — candidate's answers persisted
 *   DIAGNOSTIC_ANALYSIS_STARTED  — orchestration triggered
 *   DIAGNOSTIC_ANALYSIS_COMPLETE — score + report generated
 *   DIAGNOSTIC_ANALYSIS_FAILED   — unrecoverable error during analysis
 *
 * REPORT events
 *   REPORT_GENERATED  — AI report persisted successfully
 *   REPORT_FAILED     — report generation error
 *   REPORT_VIEWED     — candidate viewed report page (frontend event)
 *
 * BOOKING events
 *   CONSULTATION_BOOKED   — booking record created
 *
 * COMMUNICATION events
 *   COMM_EMAIL_DISPATCHED      — email send initiated
 *   COMM_WHATSAPP_DISPATCHED   — WhatsApp send initiated
 *   COMM_CRM_SYNCED            — CRM payload sent
 *   COMM_INTERNAL_ALERT_SENT   — internal Slack/webhook alert fired
 *
 * ADMIN events
 *   ADMIN_LEADS_FETCHED        — admin lead list accessed
 *   ADMIN_LEAD_DETAIL_FETCHED  — single lead detail accessed
 *
 * CANDIDATE events
 *   CANDIDATE_PROFILE_CREATED  — new candidate profile persisted
 * ─────────────────────────────────────────────────────────────────────────
 */
public enum AuditEventType {

    PAYMENT_INITIATED,
    PAYMENT_VERIFIED,
    PAYMENT_FAILED,
    WEBHOOK_RECEIVED,
    WEBHOOK_DUPLICATE,
    WEBHOOK_INVALID,

    DIAGNOSTIC_RESPONSES_SAVED,
    DIAGNOSTIC_ANALYSIS_STARTED,
    DIAGNOSTIC_ANALYSIS_COMPLETE,
    DIAGNOSTIC_ANALYSIS_FAILED,

    REPORT_GENERATED,
    REPORT_FAILED,
    REPORT_VIEWED,

    CONSULTATION_BOOKED,

    COMM_EMAIL_DISPATCHED,
    COMM_WHATSAPP_DISPATCHED,
    COMM_CRM_SYNCED,
    COMM_INTERNAL_ALERT_SENT,

    ADMIN_LEADS_FETCHED,
    ADMIN_LEAD_DETAIL_FETCHED,

    CANDIDATE_PROFILE_CREATED
}
