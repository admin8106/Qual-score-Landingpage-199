/*
  # Create diagnostic_reports table (Flyway V6 + V10 + V11)

  Combines V6 (create table), V10 (add tagline), and V11 (expand report_status values).

  1. New Tables
    - `diagnostic_reports` - AI-generated personalised employability report per candidate

  2. Columns
    - All standard report fields (report_title, score_summary_json, insights, etc.)
    - tagline (TEXT) - 1-sentence candidate situation summary
    - report_status with full set of valid values:
        GENERATED, FALLBACK_USED, RULE_BASED, FAILED, REVIEWED, PUBLISHED

  3. Indexes
    - idx_dr_candidate_profile_id
    - idx_dr_report_status

  4. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id     UUID        NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    report_title             TEXT,
    tagline                  TEXT,
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
                                 CHECK (report_status IN ('GENERATED', 'FALLBACK_USED', 'RULE_BASED', 'FAILED', 'REVIEWED', 'PUBLISHED')),
    raw_ai_response          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dr_candidate_profile_id ON diagnostic_reports (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_dr_report_status        ON diagnostic_reports (report_status);

ALTER TABLE diagnostic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to diagnostic_reports"
  ON diagnostic_reports
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert diagnostic_reports"
  ON diagnostic_reports
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update diagnostic_reports"
  ON diagnostic_reports
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  diagnostic_reports                          IS 'AI-generated personalised employability report';
COMMENT ON COLUMN diagnostic_reports.tagline                  IS '1-sentence candidate situation summary (AI or template)';
COMMENT ON COLUMN diagnostic_reports.score_summary_json       IS 'Overall score + section breakdown for the report header';
COMMENT ON COLUMN diagnostic_reports.dimension_breakdown_json IS 'Array of {dimension, score, label} objects for the chart';
COMMENT ON COLUMN diagnostic_reports.top_gaps_json            IS 'Array of {gap, severity, recommendation} objects';
COMMENT ON COLUMN diagnostic_reports.raw_ai_response          IS 'Full unstructured LLM response — retained for debugging';
COMMENT ON COLUMN diagnostic_reports.report_status            IS 'GENERATED=AI success, FALLBACK_USED=AI tried+failed, RULE_BASED=AI not configured, FAILED=error, REVIEWED/PUBLISHED=lifecycle';
