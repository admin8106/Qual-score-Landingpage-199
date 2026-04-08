package com.qualscore.qualcore.enums;

/**
 * All trackable event types in the QualScore funnel.
 *
 * Naming convention: ENTITY_ACTION
 *
 * Used in:
 *   - CommunicationEvent.eventType   (what triggered this comm event)
 *   - AnalyticsEvent.eventType       (funnel analytics)
 *   - AutomationTriggerService       (routing logic)
 */
public enum EventType {

    PAYMENT_INITIATED,
    PAYMENT_VERIFIED,
    PAYMENT_FAILED,

    PROFILE_CREATED,

    DIAGNOSTIC_STARTED,
    DIAGNOSTIC_COMPLETED,
    LINKEDIN_ANALYSIS_COMPLETED,

    REPORT_GENERATED,
    REPORT_VIEWED,

    CONSULTATION_CTA_CLICKED,
    CONSULTATION_BOOKED,
    CONSULTATION_CONFIRMED,
    CONSULTATION_COMPLETED,

    HIGH_PRIORITY_LEAD_IDENTIFIED,

    FOLLOW_UP_SENT,
    CRM_SYNCED
}
