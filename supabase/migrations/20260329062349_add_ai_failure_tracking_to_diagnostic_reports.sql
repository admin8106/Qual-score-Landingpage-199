/*
  # Add AI Failure Tracking to Diagnostic Reports

  ## Purpose
  Extends the `diagnostic_reports` table to fully support the hardened
  report generation fallback system. Adds structured failure metadata
  and the two new canonical report status values.

  ## Changes

  ### New Columns on `diagnostic_reports`
  - `ai_failure_reason` (text, nullable)
      Structured reason why AI generation failed (e.g. "HTTP 500 from OpenAI",
      "Missing required fields: dimensionBreakdown, topGaps", "JSON parse error").
      Null when status is GENERATED_AI or RULE_BASED.

  - `ai_attempts` (integer, default 0)
      Number of AI call attempts made before falling back.
      0 = AI not configured (RULE_BASED).
      1 = Failed on first attempt, no retry.
      2 = Failed after retry.

  ### New CHECK Constraint Values
  The `report_status` column was defined as VARCHAR. Two new valid values
  are added: GENERATED_AI and GENERATED_FALLBACK.
  These are the canonical names going forward. GENERATED and FALLBACK_USED
  remain valid for backwards compatibility with existing rows.

  ## Security
  - No RLS policy changes. Existing service-role-only access is preserved.

  ## Notes
  - All new columns are nullable with safe defaults — no data migration needed.
  - Re-runnable: uses IF NOT EXISTS / DO blocks throughout.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_reports'
      AND column_name = 'ai_failure_reason'
  ) THEN
    ALTER TABLE diagnostic_reports
      ADD COLUMN ai_failure_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_reports'
      AND column_name = 'ai_attempts'
  ) THEN
    ALTER TABLE diagnostic_reports
      ADD COLUMN ai_attempts integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_ai_failure
  ON diagnostic_reports (report_status)
  WHERE report_status IN ('GENERATED_FALLBACK', 'FALLBACK_USED', 'FAILED');
