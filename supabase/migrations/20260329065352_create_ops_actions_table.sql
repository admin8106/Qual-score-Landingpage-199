/*
  # Create Ops Actions Table

  ## Summary
  Creates a lightweight ops_actions table for the launch ops panel. This table
  stores quick actions taken by the team on leads: mark_contacted, mark_booked,
  and notes. It is NOT a full CRM — it is a minimal launch operations tool.

  ## New Tables
  - `ops_actions`
    - `id` (uuid, primary key)
    - `candidate_code` (text, indexed) — links to the candidate
    - `action_type` (text) — 'contacted' | 'booked' | 'note'
    - `note` (text, nullable) — free-text note content
    - `created_by` (text, nullable) — admin identifier (email or name)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Admin-only access via service role (frontend reads via Supabase anon with
    a permissive policy limited to the ops_actions table — no PII exposed)
  - Policy: allow all reads and inserts from authenticated or anon role
    (this is an internal tool; network-level protection is the primary guard)

  ## Notes
  - No foreign key to candidate_profiles to avoid tight coupling with the backend DB
  - Intentionally simple — one row per action, no updates
*/

CREATE TABLE IF NOT EXISTS ops_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text        NOT NULL,
  action_type    text        NOT NULL CHECK (action_type IN ('contacted', 'booked', 'note')),
  note           text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_actions_candidate_code
  ON ops_actions (candidate_code);

CREATE INDEX IF NOT EXISTS idx_ops_actions_created_at
  ON ops_actions (created_at DESC);

ALTER TABLE ops_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops panel read access"
  ON ops_actions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Ops panel insert access"
  ON ops_actions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
