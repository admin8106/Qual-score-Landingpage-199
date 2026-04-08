/*
  # Add LinkedIn profile text fields to candidate_profiles

  ## Purpose
  Enable the CANDIDATE_TEXT ingestion mode for LinkedIn analysis.
  When candidates paste their LinkedIn About and/or experience text,
  these fields store that content for use during diagnostic analysis.

  This allows the scoring pipeline to use richer input data without
  requiring a third-party enrichment API, producing MEDIUM confidence
  analysis vs LOW confidence from URL-only mode.

  ## New Columns

  ### linkedin_about_text (TEXT, nullable)
  The candidate's LinkedIn "About" section, pasted voluntarily.
  When present, upgrades ingestion mode from URL_ONLY to CANDIDATE_TEXT.
  Improves aboutQuality, differentiationStrength, and profileCompleteness scoring.

  ### linkedin_experience_text (TEXT, nullable)
  The candidate's LinkedIn experience section text, pasted voluntarily.
  Optional supplement to linkedin_about_text.
  Improves experiencePresentation and proofOfWorkVisibility scoring.

  ## Notes
  - Both fields are nullable — existing records and URL-only submissions are unaffected
  - No size enforcement at DB level; application-layer validation limits input to 3000/5000 chars
  - Content is stored as submitted — no sanitization at DB level
  - PII note: this text may contain personal/professional details; treat with same care as linkedin_url
*/

ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS linkedin_about_text TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_experience_text TEXT;

COMMENT ON COLUMN candidate_profiles.linkedin_about_text IS 'Candidate-pasted LinkedIn About section text. Enables CANDIDATE_TEXT ingestion mode.';
COMMENT ON COLUMN candidate_profiles.linkedin_experience_text IS 'Candidate-pasted LinkedIn experience text. Supplements linkedin_about_text for richer analysis.';
