-- ============================================================
-- V5 — Create diagnostic_scores table
--
-- One row per candidate (1:1). Stores the computed weighted
-- final employability score and all section sub-scores.
-- Also stores the CRM classification tags as a JSONB array.
--
-- Scoring formula (applied in ScoringEngine.java):
--   final_score = (linkedin × 0.40) + (career_direction × 0.12)
--               + (job_search × 0.12) + (readiness × 0.16)
--               + (flexibility × 0.10) + (intent × 0.10)
--
-- Score bands:
--   CRITICAL            ≤ 4.9
--   NEEDS_OPTIMIZATION  5.0 – 7.4
--   STRONG              ≥ 7.5
--
-- Indexes:
--   idx_ds_candidate_profile_id — fast lookup (unique constraint)
--   idx_ds_band_label           — filter by band for admin view
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostic_scores (
    id                           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id         UUID           NOT NULL UNIQUE REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    career_direction_score       NUMERIC(4, 1),
    job_search_behavior_score    NUMERIC(4, 1),
    opportunity_readiness_score  NUMERIC(4, 1),
    flexibility_constraints_score NUMERIC(4, 1),
    improvement_intent_score     NUMERIC(4, 1),
    linkedin_score               NUMERIC(4, 1),
    final_employability_score    NUMERIC(4, 1),
    band_label                   VARCHAR(40),
    tags                         JSONB,
    created_at                   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_candidate_profile_id ON diagnostic_scores (candidate_profile_id);
CREATE        INDEX IF NOT EXISTS idx_ds_band_label           ON diagnostic_scores (band_label);

COMMENT ON TABLE  diagnostic_scores                              IS '1:1 with candidate_profiles — holds computed employability scores';
COMMENT ON COLUMN diagnostic_scores.band_label                   IS 'CRITICAL | NEEDS_OPTIMIZATION | STRONG';
COMMENT ON COLUMN diagnostic_scores.tags                         IS 'JSONB array of CRM classification tags (e.g. ["high_intent","warm_lead"])';
COMMENT ON COLUMN diagnostic_scores.final_employability_score    IS 'Weighted composite score 0.0–10.0';
