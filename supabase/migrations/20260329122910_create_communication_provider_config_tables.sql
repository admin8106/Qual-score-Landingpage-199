/*
  # Communication Provider Configuration Tables

  ## Purpose
  Enables admin-managed, database-driven configuration for WhatsApp and Email
  communication providers. Admins can switch providers, manage credentials, and
  test configurations without code changes or backend restarts.

  ## New Tables

  ### 1. whatsapp_provider_configs
  Stores one record per WhatsApp gateway configuration.
  - id                        — UUID primary key
  - provider_code             — Short identifier: meta, twilio, msg91, stub, custom
  - provider_name             — Display name (e.g. "Meta Cloud API – Production")
  - environment_mode          — SANDBOX or LIVE
  - is_active                 — Whether this provider is enabled
  - is_primary                — Only one primary per environment
  - is_fallback               — Optional fallback if primary fails
  - display_order             — UI ordering

  -- Meta Cloud API fields
  - meta_access_token         — Bearer token (stored, masked for display)
  - meta_access_token_masked  — Masked version for UI
  - meta_phone_number_id      — Numeric phone number ID from Meta API Setup
  - meta_business_account_id  — Meta Business Account ID
  - meta_webhook_verify_token — Webhook verify token (stored, masked)
  - meta_webhook_verify_token_masked
  - meta_api_version          — e.g. v19.0

  -- Twilio fields (future-ready)
  - twilio_account_sid
  - twilio_auth_token_masked
  - twilio_auth_token
  - twilio_from_number        — Twilio WhatsApp sender number

  -- MSG91 fields (future-ready)
  - msg91_auth_key_masked
  - msg91_auth_key
  - msg91_sender_id

  -- Shared
  - sender_phone_display      — Human-readable sender phone for display
  - webhook_url_path          — Informational webhook path
  - template_notes            — Notes about approved message templates
  - notes                     — General admin notes
  - created_at / updated_at

  ### 2. email_provider_configs
  Stores one record per email provider configuration.
  - id                        — UUID primary key
  - provider_code             — sendgrid, ses, smtp, resend, stub, custom
  - provider_name             — Display name
  - environment_mode          — SANDBOX or LIVE
  - is_active, is_primary, is_fallback, display_order

  -- Sender identity
  - sender_email              — From address
  - sender_name               — From display name
  - reply_to_email            — Optional reply-to

  -- SendGrid
  - sendgrid_api_key_masked
  - sendgrid_api_key

  -- AWS SES
  - ses_access_key_id
  - ses_secret_access_key_masked
  - ses_secret_access_key
  - ses_region

  -- SMTP
  - smtp_host, smtp_port, smtp_username
  - smtp_password_masked, smtp_password
  - smtp_use_tls

  -- Resend
  - resend_api_key_masked
  - resend_api_key

  -- Shared
  - notes
  - created_at / updated_at

  ### 3. communication_config_test_logs
  Records of admin-triggered provider validation tests for both channels.
  - id                    — UUID primary key
  - channel               — WHATSAPP or EMAIL
  - provider_config_id    — UUID of the provider config
  - tested_by_admin_id    — Email of admin
  - test_recipient        — Phone or email used for test send
  - status                — PASS / FAIL / SKIPPED
  - summary               — Short description of result
  - checks_run            — JSON array of check names and results
  - created_at

  ## Security
  - RLS enabled on all tables
  - All policies restricted to authenticated Supabase users
  - Secrets stored in raw columns but only masked values returned to UI
  - Never expose raw tokens in API responses

  ## Notes
  1. Only one primary per environment_mode enforced by application logic.
  2. Default stub rows seeded for both channels.
  3. webhook_url_path is informational only.
*/

-- ─── whatsapp_provider_configs ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_provider_configs (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code                   text NOT NULL DEFAULT 'stub',
  provider_name                   text NOT NULL DEFAULT '',
  environment_mode                text NOT NULL DEFAULT 'SANDBOX',
  is_active                       boolean NOT NULL DEFAULT false,
  is_primary                      boolean NOT NULL DEFAULT false,
  is_fallback                     boolean NOT NULL DEFAULT false,
  display_order                   integer NOT NULL DEFAULT 100,

  -- Meta Cloud API
  meta_access_token               text,
  meta_access_token_masked        text,
  meta_phone_number_id            text,
  meta_business_account_id        text,
  meta_webhook_verify_token       text,
  meta_webhook_verify_token_masked text,
  meta_api_version                text DEFAULT 'v19.0',

  -- Twilio (future)
  twilio_account_sid              text,
  twilio_auth_token               text,
  twilio_auth_token_masked        text,
  twilio_from_number              text,

  -- MSG91 (future)
  msg91_auth_key                  text,
  msg91_auth_key_masked           text,
  msg91_sender_id                 text,

  -- Shared
  sender_phone_display            text,
  webhook_url_path                text DEFAULT '/api/v1/whatsapp/webhook',
  template_notes                  text,
  notes                           text,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read whatsapp configs"
  ON whatsapp_provider_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert whatsapp configs"
  ON whatsapp_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update whatsapp configs"
  ON whatsapp_provider_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete whatsapp configs"
  ON whatsapp_provider_configs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_code     ON whatsapp_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_primary  ON whatsapp_provider_configs(is_primary) WHERE is_primary = true;

-- ─── email_provider_configs ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_provider_configs (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code                   text NOT NULL DEFAULT 'stub',
  provider_name                   text NOT NULL DEFAULT '',
  environment_mode                text NOT NULL DEFAULT 'SANDBOX',
  is_active                       boolean NOT NULL DEFAULT false,
  is_primary                      boolean NOT NULL DEFAULT false,
  is_fallback                     boolean NOT NULL DEFAULT false,
  display_order                   integer NOT NULL DEFAULT 100,

  -- Sender identity
  sender_email                    text,
  sender_name                     text,
  reply_to_email                  text,

  -- SendGrid
  sendgrid_api_key                text,
  sendgrid_api_key_masked         text,

  -- AWS SES
  ses_access_key_id               text,
  ses_secret_access_key           text,
  ses_secret_access_key_masked    text,
  ses_region                      text DEFAULT 'ap-south-1',

  -- SMTP
  smtp_host                       text,
  smtp_port                       integer DEFAULT 587,
  smtp_username                   text,
  smtp_password                   text,
  smtp_password_masked            text,
  smtp_use_tls                    boolean NOT NULL DEFAULT true,

  -- Resend
  resend_api_key                  text,
  resend_api_key_masked           text,

  -- Shared
  notes                           text,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read email configs"
  ON email_provider_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert email configs"
  ON email_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update email configs"
  ON email_provider_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete email configs"
  ON email_provider_configs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_email_configs_code    ON email_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_email_configs_primary ON email_provider_configs(is_primary) WHERE is_primary = true;

-- ─── communication_config_test_logs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communication_config_test_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel              text NOT NULL,
  provider_config_id   uuid NOT NULL,
  tested_by_admin_id   text,
  test_recipient       text,
  status               text NOT NULL DEFAULT 'PENDING',
  summary              text,
  checks_run           jsonb DEFAULT '[]'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communication_config_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comm test logs"
  ON communication_config_test_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert comm test logs"
  ON communication_config_test_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_comm_test_logs_provider  ON communication_config_test_logs(provider_config_id);
CREATE INDEX IF NOT EXISTS idx_comm_test_logs_channel   ON communication_config_test_logs(channel);
CREATE INDEX IF NOT EXISTS idx_comm_test_logs_created   ON communication_config_test_logs(created_at DESC);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_whatsapp_provider_config_updated_at()
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

CREATE TRIGGER whatsapp_provider_configs_updated_at
  BEFORE UPDATE ON whatsapp_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_provider_config_updated_at();

CREATE OR REPLACE FUNCTION update_email_provider_config_updated_at()
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

CREATE TRIGGER email_provider_configs_updated_at
  BEFORE UPDATE ON email_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_email_provider_config_updated_at();

-- ─── Seed stub records ────────────────────────────────────────────────────────

INSERT INTO whatsapp_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, is_fallback,
  webhook_url_path, notes, display_order
) VALUES (
  'stub',
  'Stub (Development)',
  'SANDBOX',
  true, true, false,
  '/api/v1/whatsapp/webhook',
  'Built-in stub provider. Logs messages to console, no real sends. Replace with Meta Cloud API for production.',
  999
) ON CONFLICT DO NOTHING;

INSERT INTO email_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, is_fallback,
  sender_email, sender_name,
  notes, display_order
) VALUES (
  'stub',
  'Stub (Development)',
  'SANDBOX',
  true, true, false,
  'noreply@qualscore.in',
  'QualScore',
  'Built-in stub provider. Logs email content to console, no real sends. Replace with Resend or SendGrid for production.',
  999
) ON CONFLICT DO NOTHING;
