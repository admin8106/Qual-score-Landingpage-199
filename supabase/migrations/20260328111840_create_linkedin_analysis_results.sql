/*
  # Create linkedin_analysis_results table (Flyway V4)

  1. New Tables
    - `linkedin_analysis_results` - 13-signal LinkedIn profile analysis per candidate

  2. Indexes
    - idx_lar_candidate_profile_id
    - idx_lar_status

  3. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS linkedin_analysis_results (
    id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id     UUID           NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    headline_clarity         INTEGER        CHECK (headline_clarity BETWEEN 1 AND 10),
    role_clarity             INTEGER        CHECK (role_clarity BETWEEN 1 AND 10),
    profile_completeness     INTEGER        CHECK (profile_completeness BETWEEN 1 AND 10),
    about_quality            INTEGER        CHECK (about_quality BETWEEN 1 AND 10),
    experience_presentation  INTEGER        CHECK (experience_presentation BETWEEN 1 AND 10),
    proof_of_work_visibility INTEGER        CHECK (proof_of_work_visibility BETWEEN 1 AND 10),
    certifications_signal    INTEGER        CHECK (certifications_signal BETWEEN 1 AND 10),
    recommendation_signal    INTEGER        CHECK (recommendation_signal BETWEEN 1 AND 10),
    activity_visibility      INTEGER        CHECK (activity_visibility BETWEEN 1 AND 10),
    career_consistency       INTEGER        CHECK (career_consistency BETWEEN 1 AND 10),
    growth_progression       INTEGER        CHECK (growth_progression BETWEEN 1 AND 10),
    differentiation_strength INTEGER        CHECK (differentiation_strength BETWEEN 1 AND 10),
    recruiter_attractiveness INTEGER        CHECK (recruiter_attractiveness BETWEEN 1 AND 10),
    summary_notes            JSONB,
    top_strengths            JSONB,
    top_concerns             JSONB,
    linkedin_score           NUMERIC(4, 1),
    analysis_status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                                 CHECK (analysis_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED')),
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lar_candidate_profile_id ON linkedin_analysis_results (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_lar_status               ON linkedin_analysis_results (analysis_status);

ALTER TABLE linkedin_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to linkedin_analysis_results"
  ON linkedin_analysis_results
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert linkedin_analysis_results"
  ON linkedin_analysis_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update linkedin_analysis_results"
  ON linkedin_analysis_results
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  linkedin_analysis_results                        IS '13-signal LLM-based LinkedIn profile analysis per candidate';
COMMENT ON COLUMN linkedin_analysis_results.linkedin_score         IS 'Composite 0-10 score derived from the 13 signals';
COMMENT ON COLUMN linkedin_analysis_results.summary_notes          IS 'JSONB array of short diagnostic observations';
COMMENT ON COLUMN linkedin_analysis_results.top_strengths          IS 'JSONB array of identified profile strengths';
COMMENT ON COLUMN linkedin_analysis_results.top_concerns           IS 'JSONB array of identified profile weaknesses';
