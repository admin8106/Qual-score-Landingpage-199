-- ============================================================
-- V4 — Create linkedin_analysis_results table
--
-- Stores the 13-signal LinkedIn profile analysis result produced
-- by the LLM (GPT-4o / Claude) after Proxycurl profile fetch.
-- Each signal is a 1-10 integer score.
--
-- Arrays (summary_notes, top_strengths, top_concerns) are stored
-- as JSONB arrays for flexible querying without a join table.
--
-- Indexes:
--   idx_lar_candidate_profile_id — all analyses per candidate
--   idx_lar_status               — queue failed / pending retries
-- ============================================================

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

COMMENT ON TABLE  linkedin_analysis_results                        IS '13-signal LLM-based LinkedIn profile analysis per candidate';
COMMENT ON COLUMN linkedin_analysis_results.linkedin_score         IS 'Composite 0-10 score derived from the 13 signals';
COMMENT ON COLUMN linkedin_analysis_results.summary_notes          IS 'JSONB array of short diagnostic observations';
COMMENT ON COLUMN linkedin_analysis_results.top_strengths          IS 'JSONB array of identified profile strengths';
COMMENT ON COLUMN linkedin_analysis_results.top_concerns           IS 'JSONB array of identified profile weaknesses';
