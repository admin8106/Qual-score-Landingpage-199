-- ============================================================
-- V1 — Create candidate_profiles table
--
-- Stores core identity and career context for each candidate
-- who enters the diagnostic funnel. One row per unique candidate.
--
-- Indexes:
--   idx_cp_email          — lookup by email (login / dedup)
--   idx_cp_mobile         — lookup by mobile number
--   idx_cp_candidate_code — unique public reference (e.g. QS-2024-0001)
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_code          VARCHAR(20) NOT NULL UNIQUE,
    full_name               TEXT        NOT NULL,
    mobile_number           VARCHAR(20) NOT NULL,
    email                   TEXT        NOT NULL,
    location                TEXT,
    current_role            TEXT,
    total_experience_years  VARCHAR(10),
    career_stage            VARCHAR(30)
                                CHECK (career_stage IN ('FRESHER', 'WORKING_PROFESSIONAL')),
    industry                TEXT,
    linkedin_url            VARCHAR(500),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_email          ON candidate_profiles (email);
CREATE INDEX IF NOT EXISTS idx_cp_mobile         ON candidate_profiles (mobile_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_candidate_code ON candidate_profiles (candidate_code);

COMMENT ON TABLE  candidate_profiles                        IS 'One row per candidate entering the QualScore diagnostic funnel';
COMMENT ON COLUMN candidate_profiles.candidate_code         IS 'Human-readable public reference, e.g. QS-2024-0001';
COMMENT ON COLUMN candidate_profiles.career_stage           IS 'FRESHER or WORKING_PROFESSIONAL — drives scoring weights';
COMMENT ON COLUMN candidate_profiles.total_experience_years IS 'Free-text years band as submitted (e.g. "3-5 years")';
