package com.qualscore.qualcore.notification;

import com.qualscore.qualcore.enums.CareerStage;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Canonical CRM payload structure.
 *
 * This is the data envelope that will be serialised to JSON and:
 *   1. Stored in CommunicationEvent.payloadJson for audit/replay
 *   2. Sent to the CRM webhook when real integration is wired up
 *
 * Field naming mirrors common CRM field conventions (e.g. HubSpot, Zoho CRM).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * All fields are nullable — set only what is available at trigger time.
 * Build using CrmPayloadBuilder, never construct directly in services.
 * ─────────────────────────────────────────────────────────────────────────
 */
public record CrmPayload(

    String candidateReference,
    String fullName,
    String email,
    String mobileNumber,
    String currentRole,
    String totalExperienceYears,
    CareerStage careerStage,
    String industry,
    String linkedinUrl,

    BigDecimal finalEmployabilityScore,
    String bandLabel,
    List<String> tags,
    String leadPriority,

    String paymentStatus,
    String reportStatus,
    String consultationStatus,

    String triggerEvent,
    OffsetDateTime eventTimestamp,
    OffsetDateTime createdAt
) {}
