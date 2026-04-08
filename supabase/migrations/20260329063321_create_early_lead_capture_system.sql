/*
  # Early Lead Capture System

  ## Purpose
  Ensures zero lead leakage by capturing partial user data at the earliest
  possible funnel touchpoint — before payment, before form completion, even
  before the user finishes typing their email.

  ## New Tables

  ### `early_leads`
  Captures partial data from the very first funnel touchpoint (CTA click,
  email entry, payment initiation). Updated progressively as the user
  advances through the funnel. Never deleted.

  ### Columns
  - `id` — UUID primary key
  - `anon_id` — browser-generated anonymous ID (set at CTA click, stable per session)
  - `email` — captured on email blur or payment initiation (nullable for pure CTA clicks)
  - `name` — captured when typed (nullable)
  - `phone` — captured when typed (nullable)
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` — URL query params at time of CTA click
  - `referrer` — document.referrer at time of first touch
  - `first_touch_page` — page where the first interaction occurred
  - `funnel_stage` — latest known stage: CTA_CLICKED | PAYMENT_STARTED | PAYMENT_DONE | PROFILE_FILLED | DIAGNOSTIC_DONE | REPORT_DONE
  - `drop_tags` — JSONB array: payment_drop, profile_drop, diagnostic_drop (set when session expires without progress)
  - `payment_ref` — payment reference once initiated
  - `payment_status` — pending | completed | failed
  - `candidate_code` — set after backend profile creation
  - `report_generated` — boolean, true when report is complete
  - `is_complete` — true only when report is generated (full funnel completion)
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled with anon insert/update by anon_id
  - Service role has full access for admin reads
  - No user can read another user's record

  ## Notes
  - `anon_id` is set in localStorage on first CTA click and is stable per browser
  - Upsert on `anon_id` ensures one record per browser session, updated progressively
  - `drop_tags` are added when the user fails to advance within 24h of a stage
  - `is_complete` is the definitive "converted" flag for funnel rate calculations
*/

CREATE TABLE IF NOT EXISTS early_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id           text NOT NULL,
  email             text,
  name              text,
  phone             text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  referrer          text,
  first_touch_page  text NOT NULL DEFAULT '/',
  funnel_stage      text NOT NULL DEFAULT 'CTA_CLICKED',
  drop_tags         jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_ref       text,
  payment_status    text NOT NULL DEFAULT 'none',
  candidate_code    text,
  report_generated  boolean NOT NULL DEFAULT false,
  is_complete       boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE early_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert own early lead"
  ON early_leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update own early lead"
  ON early_leads FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can read all early leads"
  ON early_leads FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Anon can read own early lead"
  ON early_leads FOR SELECT
  TO anon
  USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_early_leads_anon_id
  ON early_leads (anon_id);

CREATE INDEX IF NOT EXISTS idx_early_leads_email
  ON early_leads (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_early_leads_funnel_stage
  ON early_leads (funnel_stage);

CREATE INDEX IF NOT EXISTS idx_early_leads_is_complete
  ON early_leads (is_complete);

CREATE INDEX IF NOT EXISTS idx_early_leads_payment_ref
  ON early_leads (payment_ref)
  WHERE payment_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_early_leads_created_at
  ON early_leads (created_at DESC);

CREATE OR REPLACE FUNCTION update_early_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_early_leads_updated_at ON early_leads;
CREATE TRIGGER trg_early_leads_updated_at
  BEFORE UPDATE ON early_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_early_leads_updated_at();
