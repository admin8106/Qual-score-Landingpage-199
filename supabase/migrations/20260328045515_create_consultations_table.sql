/*
  # Create consultations table

  ## Summary
  Stores consultation booking records submitted from the BookingPage after
  a candidate completes the Employability Diagnostic Report.

  ## New Tables

  ### consultations
  - `id` (uuid, PK) — unique booking record identifier
  - `lead_id` (text) — references the lead who completed the diagnostic (nullable for offline flows)
  - `session_id` (text) — the diagnostic session ID for cross-referencing the report
  - `candidate_name` (text) — candidate full name at time of booking
  - `candidate_email` (text) — candidate email for sending confirmation
  - `candidate_phone` (text) — candidate phone number
  - `job_role` (text) — role the candidate is targeting
  - `preferred_date` (text) — human-readable preferred consultation date (e.g. "Mon, 29 Apr 2026")
  - `preferred_time` (text) — preferred time slot (e.g. "10:00 AM")
  - `notes` (text) — optional pre-consultation notes from the candidate
  - `employability_score` (numeric) — final employability score from the diagnostic (0–10)
  - `score_band` (text) — band label: 'critical' | 'needs_optimization' | 'strong'
  - `booking_ref` (text, unique) — short unique reference shown to candidate on confirmation
  - `status` (text) — booking lifecycle: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  - `created_at` (timestamptz) — booking submission timestamp

  ## Security
  - RLS enabled; write-only access for anonymous users (submit their own booking)
  - No read access for anonymous users (prevents data harvesting)
  - Service role retains full access for admin/CRM use
*/

CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text,
  session_id text,
  candidate_name text NOT NULL DEFAULT '',
  candidate_email text NOT NULL DEFAULT '',
  candidate_phone text NOT NULL DEFAULT '',
  job_role text NOT NULL DEFAULT '',
  preferred_date text NOT NULL DEFAULT '',
  preferred_time text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  employability_score numeric(4,2) NOT NULL DEFAULT 0,
  score_band text NOT NULL DEFAULT 'needs_optimization',
  booking_ref text UNIQUE NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a consultation booking"
  ON consultations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
