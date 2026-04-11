/*
  Flyway V1 - candidate_profiles table
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_code          VARCHAR(20) NOT NULL UNIQUE,
    full_name               TEXT NOT NULL,
    mobile_number           VARCHAR(20) NOT NULL,
    email                   TEXT NOT NULL,
    location                TEXT,
    "current_role"          TEXT,
    total_experience_years  VARCHAR(10),
    career_stage            VARCHAR(30)
        CHECK (career_stage IN ('FRESHER', 'WORKING_PROFESSIONAL')),
    industry                TEXT,
    linkedin_url            VARCHAR(500),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_email ON candidate_profiles (email);
CREATE INDEX IF NOT EXISTS idx_cp_mobile ON candidate_profiles (mobile_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_candidate_code ON candidate_profiles (candidate_code);

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
ON candidate_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE candidate_profiles IS 'One row per candidate entering QualScore';
