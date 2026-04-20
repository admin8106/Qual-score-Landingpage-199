package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.response.AdminLeadV1ListResponse;
import com.qualscore.qualcore.dto.response.AdminLeadV1Record;

/**
 * Admin lead service for the v1 admin API.
 *
 * Responsibilities:
 *   - Aggregate candidate profile, score, report, and booking data into a unified lead view
 *   - Derive lead priority from diagnostic tags (HIGH / MEDIUM / NORMAL)
 *   - Support filter and search parameters (designed for future admin UI pagination)
 *
 * Priority derivation rules:
 *   HIGH   — tagsJson contains "high_pain_lead" or "consultation_priority"
 *   MEDIUM — tagsJson contains "warm_diagnostic_lead" or "high_intent"
 *   NORMAL — all other cases
 *
 * Filter values supported:
 *   "all"      — all leads, ordered by createdAt DESC
 *   "high"     — HIGH priority leads only
 *   "medium"   — MEDIUM priority leads only
 *   "reported" — leads with a diagnostic report
 *   "booked"   — leads with a REQUESTED or CONFIRMED booking
 *
 * Search: applied to fullName, email, mobileNumber, candidateCode.
 */
public interface AdminLeadService {

    AdminLeadV1ListResponse fetchLeads(int limit, int offset, String filter, String search);

    AdminLeadV1Record getLeadByCandidateReference(String candidateReference);
}
