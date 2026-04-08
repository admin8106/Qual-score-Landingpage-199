/*
  # Add candidate metadata fields to leads table

  ## Summary
  Adds three new columns to the `leads` table to capture full candidate metadata:
  - `location` (text) — city/location of the candidate
  - `career_stage` (text) — 'fresher' or 'working_professional'
  - `industry` (text) — industry or domain the candidate works in

  ## Changes
  - `leads` table: 3 new nullable text columns added safely with IF NOT EXISTS checks

  ## Notes
  - All new columns are nullable to preserve backward compatibility with existing rows
  - No destructive changes; existing data is untouched
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'location'
  ) THEN
    ALTER TABLE leads ADD COLUMN location text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'career_stage'
  ) THEN
    ALTER TABLE leads ADD COLUMN career_stage text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'industry'
  ) THEN
    ALTER TABLE leads ADD COLUMN industry text DEFAULT '';
  END IF;
END $$;
