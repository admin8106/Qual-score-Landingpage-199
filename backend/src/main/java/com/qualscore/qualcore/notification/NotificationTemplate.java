package com.qualscore.qualcore.notification;

import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.EventType;

/**
 * Immutable descriptor for a single notification template.
 *
 * templateCode  — unique identifier used in CommunicationEvent.templateCode
 * channel       — which channel this template targets
 * triggerEvent  — the EventType that should fire this template
 * subjectLine   — email subject (null for WhatsApp/internal)
 * bodyTemplate  — message body with [PLACEHOLDER] tokens
 */
public record NotificationTemplate(
        String templateCode,
        ChannelType channel,
        EventType triggerEvent,
        String subjectLine,
        String bodyTemplate
) {}
