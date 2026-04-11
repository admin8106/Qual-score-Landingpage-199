/*
  # Create candidate_profiles table (Flyway V1)

  1. New Tables
    - `candidate_profiles` - Core identity and career context for each candidate

  2. Indexes
    - idx_cp_email - lookup by email
    - idx_cp_mobile - lookup by mobile number
    - idx_cp_candidate_code - unique public reference

  3. Security
    - Enable RLS
    - Service role policies for backend access
*/

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_code          VARCHAR(20) NOT NULL UNIQUE,
    full_name               TEXT        NOT NULL,
    mobile_number           VARCHAR(20) NOT NULL,
    email                   TEXT        NOT NULL,
    location                TEXT,
    current_job_role          TEXT,
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

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to candidate_profiles"
  ON candidate_profiles
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert candidate_profiles"
  ON candidate_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update candidate_profiles"
  ON candidate_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  candidate_profiles                        IS 'One row per candidate entering the QualScore diagnostic funnel';
COMMENT ON COLUMN candidate_profiles.candidate_code         IS 'Human-readable public reference, e.g. QS-2024-0001';
COMMENT ON COLUMN candidate_profiles.career_stage           IS 'FRESHER or WORKING_PROFESSIONAL — drives scoring weights';
COMMENT ON COLUMN candidate_profiles.total_experience_years IS 'Free-text years band as submitted (e.g. "3-5 years")';
