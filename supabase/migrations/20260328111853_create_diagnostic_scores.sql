/*
  # Create diagnostic_scores table (Flyway V5)

  1. New Tables
    - `diagnostic_scores` - 1:1 with candidate_profiles, holds computed employability scores

  2. Indexes
    - idx_ds_candidate_profile_id (unique)
    - idx_ds_band_label

  3. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS diagnostic_scores (
    id                            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id          UUID           NOT NULL UNIQUE REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    career_direction_score        NUMERIC(4, 1),
    job_search_behavior_score     NUMERIC(4, 1),
    opportunity_readiness_score   NUMERIC(4, 1),
    flexibility_constraints_score NUMERIC(4, 1),
    improvement_intent_score      NUMERIC(4, 1),
    linkedin_score                NUMERIC(4, 1),
    final_employability_score     NUMERIC(4, 1),
    band_label                    VARCHAR(40),
    tags                          JSONB,
    created_at                    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_candidate_profile_id ON diagnostic_scores (candidate_profile_id);
CREATE        INDEX IF NOT EXISTS idx_ds_band_label           ON diagnostic_scores (band_label);

ALTER TABLE diagnostic_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to diagnostic_scores"
  ON diagnostic_scores
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert diagnostic_scores"
  ON diagnostic_scores
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update diagnostic_scores"
  ON diagnostic_scores
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  diagnostic_scores                              IS '1:1 with candidate_profiles — holds computed employability scores';
COMMENT ON COLUMN diagnostic_scores.band_label                   IS 'CRITICAL | NEEDS_OPTIMIZATION | STRONG';
COMMENT ON COLUMN diagnostic_scores.tags                         IS 'JSONB array of CRM classification tags (e.g. ["high_intent","warm_lead"])';
COMMENT ON COLUMN diagnostic_scores.final_employability_score    IS 'Weighted composite score 0.0–10.0';
