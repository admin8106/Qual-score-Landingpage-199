-- ============================================================
-- V6 — Create diagnostic_reports table
--
-- Stores the full AI-generated (or rule-based) personalised
-- employability report for each candidate. Long text fields
-- are stored as TEXT; structured data as JSONB.
--
-- A candidate may have multiple report versions (regeneration),
-- but only the latest is surfaced to the frontend.
--
-- Indexes:
--   idx_dr_candidate_profile_id — all reports for a candidate
--   idx_dr_report_status        — filter by lifecycle status
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id     UUID        NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    report_title             TEXT,
    score_summary_json       JSONB,
    linkedin_insight         TEXT,
    behavioral_insight       TEXT,
    dimension_breakdown_json JSONB,
    top_gaps_json            JSONB,
    risk_projection          TEXT,
    recommendation           TEXT,
    recruiter_view_insight   TEXT,
    cta_headline             TEXT,
    cta_body                 TEXT,
    cta_button_text          VARCHAR(80),
    report_status            VARCHAR(20) NOT NULL DEFAULT 'GENERATED'
                                 CHECK (report_status IN ('GENERATED', 'REVIEWED', 'PUBLISHED', 'FAILED')),
    raw_ai_response          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dr_candidate_profile_id ON diagnostic_reports (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_dr_report_status        ON diagnostic_reports (report_status);

COMMENT ON TABLE  diagnostic_reports                        IS 'AI-generated personalised employability report';
COMMENT ON COLUMN diagnostic_reports.score_summary_json     IS 'Overall score + section breakdown for the report header';
COMMENT ON COLUMN diagnostic_reports.dimension_breakdown_json IS 'Array of {dimension, score, label} objects for the chart';
COMMENT ON COLUMN diagnostic_reports.top_gaps_json          IS 'Array of {gap, severity, recommendation} objects';
COMMENT ON COLUMN diagnostic_reports.raw_ai_response        IS 'Full unstructured LLM response — retained for debugging';
COMMENT ON COLUMN diagnostic_reports.report_status          IS 'GENERATED → REVIEWED → PUBLISHED lifecycle; FAILED on error';
