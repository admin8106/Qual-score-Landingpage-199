-- ============================================================
-- V3 — Create diagnostic_question_responses table
--
-- One row per question answered by a candidate. The 15 questions
-- span 5 sections (career_direction, job_search_behavior,
-- opportunity_readiness, flexibility_constraints, improvement_intent).
--
-- Scores are 1-10 integers assigned by the selected option.
-- Section averages are computed at query time or cached in
-- diagnostic_scores (V5).
--
-- Indexes:
--   idx_dqr_candidate_profile_id  — all answers for a candidate
--   idx_dqr_section_code          — filter by section
--   idx_dqr_candidate_section     — composite — section score query
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostic_question_responses (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID        NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    question_code        VARCHAR(20) NOT NULL,
    section_code         VARCHAR(40) NOT NULL,
    selected_option_code VARCHAR(20) NOT NULL,
    selected_option_text TEXT        NOT NULL,
    score                INTEGER     NOT NULL CHECK (score BETWEEN 1 AND 10),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dqr_candidate_profile_id ON diagnostic_question_responses (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_dqr_section_code         ON diagnostic_question_responses (section_code);
CREATE INDEX IF NOT EXISTS idx_dqr_candidate_section    ON diagnostic_question_responses (candidate_profile_id, section_code);

COMMENT ON TABLE  diagnostic_question_responses                  IS 'One row per answered question — up to 15 per candidate';
COMMENT ON COLUMN diagnostic_question_responses.question_code    IS 'e.g. Q01, Q02 ... Q15';
COMMENT ON COLUMN diagnostic_question_responses.section_code     IS 'One of: career_direction, job_search_behavior, opportunity_readiness, flexibility_constraints, improvement_intent';
COMMENT ON COLUMN diagnostic_question_responses.score            IS 'Integer 1-10 mapped from selected option';
