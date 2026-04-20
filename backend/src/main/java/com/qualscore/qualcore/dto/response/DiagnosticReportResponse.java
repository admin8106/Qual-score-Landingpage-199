package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.ReportStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Frontend contract for GET /api/v1/reports/{candidateReference}.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SCHEMA CONTRACT (field names are part of the frontend API contract)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * scoreSummary:
 *   { employabilityScore: number, bandLabel: string, tagline: string }
 *
 * dimensionBreakdown:
 *   [ { area: string, score: number, status: string, remark: string } × 6 ]
 *   Areas (fixed order): Career Direction, Job Search Behavior,
 *     Opportunity Readiness, Flexibility & Constraints,
 *     Improvement Intent, LinkedIn Presence
 *
 * topGaps:
 *   [ string × 3 ]  — plain sentences, most impactful first
 *
 * reportStatus:
 *   GENERATED      = AI-generated (OpenAI call succeeded)
 *   FALLBACK_USED  = AI was tried but failed; template report used instead
 *   RULE_BASED     = AI not configured; template report used
 *   FAILED         = Unexpected error in both AI and fallback paths
 *
 * tagline:
 *   1 punchy sentence characterizing the candidate's situation.
 *   Sourced from scoreSummary.tagline — also exposed as a top-level field
 *   for convenient rendering without parsing the nested scoreSummary object.
 */
@Data
@Builder
public class DiagnosticReportResponse {

    private UUID id;
    private String candidateCode;
    private String reportTitle;
    private Object scoreSummary;
    private String tagline;
    private String linkedinInsight;
    private String behavioralInsight;
    private Object dimensionBreakdown;
    private Object topGaps;
    private String riskProjection;
    private String recommendation;
    private String recruiterViewInsight;
    private String ctaHeadline;
    private String ctaBody;
    private String ctaButtonText;
    private ReportStatus reportStatus;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
