package com.qualscore.qualcore.enums;

/**
 * Internal lead priority classification, derived at query time from diagnostic tags.
 *
 * Derivation rules:
 *   HIGH   — tags contain "high_pain_lead" or "consultation_priority"
 *   MEDIUM — tags contain "warm_diagnostic_lead" or "high_intent"
 *   NORMAL — all other cases
 *
 * Not persisted. Computed in service layer on every admin lead response.
 */
public enum LeadPriority {
    HIGH,
    MEDIUM,
    NORMAL
}
