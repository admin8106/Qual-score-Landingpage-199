/*
  # Payment Provider Configuration Tables

  ## Purpose
  Enables admin-managed, database-driven payment gateway configuration so the
  backend can dynamically read the active payment provider settings instead of
  relying solely on environment variables. Allows zero-code provider switching.

  ## New Tables

  ### 1. payment_provider_configs
  Stores one record per payment gateway configuration.
  - id                    — UUID primary key
  - provider_code         — Short identifier: payu, razorpay, mock, stripe, custom
  - provider_name         — Display name (e.g. "PayU Money – Production")
  - environment_mode      — SANDBOX or LIVE
  - is_active             — Whether this provider is enabled
  - is_primary            — Whether this is the currently active primary provider
  - is_fallback           — Whether to use as fallback when primary fails
  - display_order         — UI ordering

  -- PayU fields (encrypted where sensitive)
  - payu_merchant_key     — Merchant key (AES-256 encrypted)
  - payu_merchant_key_masked
  - payu_salt             — Salt / secret (AES-256 encrypted)
  - payu_salt_masked
  - payu_base_url         — PayU endpoint (test or production)
  - payu_success_url      — Callback URL for successful payment
  - payu_failure_url      — Callback URL for failed payment

  -- Razorpay fields
  - razorpay_key_id       — Public key ID (stored plaintext – safe to expose)
  - razorpay_key_secret   — Secret key (AES-256 encrypted)
  - razorpay_key_secret_masked
  - razorpay_webhook_secret — Webhook signature secret (AES-256 encrypted)
  - razorpay_webhook_secret_masked

  -- Shared
  - webhook_url_path      — The webhook path this provider listens on (read-only, informational)
  - notes                 — Admin notes
  - created_at / updated_at

  ### 2. payment_config_test_logs
  Records of admin-triggered payment configuration validation tests.
  - id                    — UUID primary key
  - provider_config_id    — FK to payment_provider_configs
  - tested_by_admin_id    — Email of admin
  - status                — PASS / FAIL / SKIPPED
  - summary               — Short description of result
  - checks_run            — JSON array of check names and results
  - created_at

  ## Security
  - RLS enabled on all tables
  - All policies restricted to authenticated Supabase users
  - Secrets stored encrypted; only masked versions returned to UI
  - Merchant keys and salts NEVER returned as plaintext after save

  ## Notes
  1. Only one primary per environment_mode is enforced by application logic.
  2. Default rows for mock provider seeded for development readiness.
  3. webhook_url_path is informational only — the actual routing lives in the backend.
*/

-- ─── payment_provider_configs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_provider_configs (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code                 text NOT NULL,
  provider_name                 text NOT NULL DEFAULT '',
  environment_mode              text NOT NULL DEFAULT 'SANDBOX',
  is_active                     boolean NOT NULL DEFAULT false,
  is_primary                    boolean NOT NULL DEFAULT false,
  is_fallback                   boolean NOT NULL DEFAULT false,
  display_order                 integer NOT NULL DEFAULT 100,

  -- PayU
  payu_merchant_key             text,
  payu_merchant_key_masked      text,
  payu_salt                     text,
  payu_salt_masked              text,
  payu_base_url                 text,
  payu_success_url              text,
  payu_failure_url              text,

  -- Razorpay
  razorpay_key_id               text,
  razorpay_key_secret           text,
  razorpay_key_secret_masked    text,
  razorpay_webhook_secret       text,
  razorpay_webhook_secret_masked text,

  -- Shared
  webhook_url_path              text DEFAULT '/api/v1/payments/webhook',
  notes                         text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment provider configs"
  ON payment_provider_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert payment provider configs"
  ON payment_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payment provider configs"
  ON payment_provider_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete payment provider configs"
  ON payment_provider_configs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payment_provider_configs_code ON payment_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_payment_provider_configs_primary ON payment_provider_configs(is_primary) WHERE is_primary = true;

-- ─── payment_config_test_logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_config_test_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_config_id   uuid NOT NULL REFERENCES payment_provider_configs(id) ON DELETE CASCADE,
  tested_by_admin_id   text,
  status               text NOT NULL DEFAULT 'PENDING',
  summary              text,
  checks_run           jsonb DEFAULT '[]'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_config_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment test logs"
  ON payment_config_test_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert payment test logs"
  ON payment_config_test_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payment_test_logs_provider_id ON payment_config_test_logs(provider_config_id);
CREATE INDEX IF NOT EXISTS idx_payment_test_logs_created_at ON payment_config_test_logs(created_at DESC);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_payment_provider_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_provider_configs_updated_at
  BEFORE UPDATE ON payment_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_payment_provider_config_updated_at();

-- ─── Seed mock provider for development ───────────────────────────────────────

INSERT INTO payment_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, is_fallback,
  webhook_url_path, notes, display_order
) VALUES (
  'mock',
  'Mock Gateway (Development)',
  'SANDBOX',
  true, true, false,
  '/api/v1/payments/webhook',
  'Built-in mock gateway for development and testing. No real money movement. Always approves payments.',
  999
) ON CONFLICT DO NOTHING;
