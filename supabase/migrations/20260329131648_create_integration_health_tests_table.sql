/*
  # Integration Health Tests — Unified Cross-Provider Test Log

  ## Summary
  Creates a single `integration_health_tests` table that stores test results for every
  provider across every category (AI, Payments, WhatsApp, Email, CRM, Analytics, Storage,
  Scheduling). This powers the Integration Health & Test Center admin screen.

  ## New Tables

  ### `integration_health_tests`
  Each row is one test run against a specific provider config record.

  Columns:
  - `id` — primary key
  - `category` — provider category (ai, payments, whatsapp, email, crm, analytics, storage, scheduling)
  - `provider_table` — the source table the provider lives in (e.g. ai_provider_configs)
  - `provider_id` — UUID FK to the provider row (intentionally no hard FK so it works across tables)
  - `provider_code` — snapshot of provider_code at test time
  - `provider_name` — snapshot of provider_name at test time
  - `environment_mode` — SANDBOX or LIVE
  - `test_type` — what was tested (e.g. PROMPT_CALL, CONFIG_VALIDATION, TEST_SEND, etc.)
  - `status` — PENDING | SUCCESS | FAILURE | TIMEOUT | SKIPPED
  - `response_summary` — human-readable outcome (1–2 sentences)
  - `error_detail` — full error message if failed
  - `latency_ms` — milliseconds the test took
  - `checks_run` — JSONB array of {name, passed, detail} check objects
  - `tested_by_admin_id` — who triggered the test
  - `tested_by_email` — email snapshot
  - `created_at` — when the test ran

  ## Security
  - RLS enabled.
  - Authenticated users can INSERT (system writes on test run) and SELECT (admin reads).
  - No UPDATE or DELETE — tests are immutable append-only audit records.

  ## Indexes
  - category, provider_id for per-provider lookups
  - created_at DESC for recency ordering
  - status for filtering failed/healthy
*/

CREATE TABLE IF NOT EXISTS integration_health_tests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category             text NOT NULL,
  provider_table       text NOT NULL DEFAULT '',
  provider_id          uuid NOT NULL,
  provider_code        text NOT NULL DEFAULT '',
  provider_name        text NOT NULL DEFAULT '',
  environment_mode     text NOT NULL DEFAULT 'SANDBOX',
  test_type            text NOT NULL DEFAULT 'CONFIG_VALIDATION',
  status               text NOT NULL DEFAULT 'PENDING',
  response_summary     text,
  error_detail         text,
  latency_ms           integer,
  checks_run           jsonb NOT NULL DEFAULT '[]'::jsonb,
  tested_by_admin_id   uuid,
  tested_by_email      text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_health_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert health tests"
  ON integration_health_tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read health tests"
  ON integration_health_tests FOR SELECT
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_tests_provider ON integration_health_tests (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_tests_category ON integration_health_tests (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_tests_status ON integration_health_tests (status);
CREATE INDEX IF NOT EXISTS idx_health_tests_created ON integration_health_tests (created_at DESC);
