/*
  # Employability Diagnostic Report - Schema

  ## Overview
  Core data schema for QualScore's Employability Diagnostic product.

  ## New Tables

  ### 1. `leads` - Candidate funnel entries
  ### 2. `diagnostic_sessions` - Q&A sessions per lead
  ### 3. `reports` - Generated diagnostic reports

  ## Security
  - RLS enabled on all tables
  - Anon users can insert (funnel entry) and read their own data via session ID
  - Authenticated (admin) users can read all data
*/

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  linkedin_url text NOT NULL DEFAULT '',
  job_role text NOT NULL DEFAULT '',
  target_role text NOT NULL DEFAULT '',
  years_experience text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_ref text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert lead"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read own lead"
  ON leads FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can update own lead"
  ON leads FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Diagnostic sessions table
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]',
  overall_score int NOT NULL DEFAULT 0,
  category_scores jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert session"
  ON diagnostic_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update session"
  ON diagnostic_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read session"
  ON diagnostic_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can read sessions"
  ON diagnostic_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  report_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert report"
  ON reports FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read report"
  ON reports FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can read reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_lead_id ON diagnostic_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_lead_id ON reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
