/*
  # Add Scoring Engine Fields

  Extends the schema to persist the output of the new scoring engine.

  ## Changes

  ### diagnostic_sessions table
  - `final_employability_score` (numeric 4,1) — weighted final score on 0–10 scale
  - `score_band` (text) — 'critical' | 'needs_optimization' | 'strong'
  - `linkedin_score` (numeric 4,1) — mock LinkedIn score used in weighting
  - `section_scores` (jsonb) — object with per-section averages (5 sections)
  - `crm_tags` (text[]) — array of internal CRM classification tags
  - `linkedin_analysis` (jsonb) — full LinkedIn analysis object (mock, replaceable)

  ### leads table
  - `final_employability_score` (numeric 4,1) — denormalized for fast admin queries
  - `score_band` (text) — denormalized band label
  - `crm_tags` (text[]) — denormalized CRM tags for fast filtering

  ## Notes
  - All columns use IF NOT EXISTS guard to be safe on re-run
  - No RLS changes needed; existing RLS on both tables already covers new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'final_employability_score'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN final_employability_score numeric(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'score_band'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN score_band text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'linkedin_score'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN linkedin_score numeric(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'section_scores'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN section_scores jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'crm_tags'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN crm_tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_sessions' AND column_name = 'linkedin_analysis'
  ) THEN
    ALTER TABLE diagnostic_sessions ADD COLUMN linkedin_analysis jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'final_employability_score'
  ) THEN
    ALTER TABLE leads ADD COLUMN final_employability_score numeric(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'score_band'
  ) THEN
    ALTER TABLE leads ADD COLUMN score_band text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'crm_tags'
  ) THEN
    ALTER TABLE leads ADD COLUMN crm_tags text[];
  END IF;
END $$;
