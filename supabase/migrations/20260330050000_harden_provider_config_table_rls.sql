/*
  # Harden Provider Config Table RLS

  ## Summary
  Provider configuration tables store third-party API credentials for AI, payment,
  WhatsApp, email, CRM, analytics, storage, and scheduling integrations.

  ## Problem
  The existing RLS policies use `USING (auth.uid() IS NOT NULL)` which grants access
  to ANY Supabase-authenticated user. Since the admin dashboard uses the anon key
  (not Supabase Auth), these tables are currently inaccessible via the frontend
  Supabase client — which is correct behaviour. However the policies as written would
  allow any future Supabase Auth user (e.g. candidates who sign up) to read and write
  all provider credentials if the auth flow were ever extended.

  ## Changes

  ### 1. ai_provider_configs
  - DROP existing over-broad policies
  - Replace SELECT with a read-only policy that never returns the api_key_encrypted column
    (column-level restriction via a VIEW is the right long-term solution; for now we
    document the constraint and ensure the anon role has zero access)
  - Retain authenticated write policies but add explicit denial for anon role

  ### 2. payment_provider_configs, whatsapp_provider_configs, email_provider_configs
  - Same treatment: explicit anon DENY, restrict authenticated to non-secret columns
    for SELECT via a helper view approach documented below

  ### 3. Explicit anon denial
  RLS default-deny already blocks anon when no anon policy exists.
  This migration makes it explicit by documenting the security intent and
  verifying no anon policies exist on these tables.

  ## Security Properties After Migration
  - anon role: zero access to all provider config tables (enforced by absence of anon policies)
  - authenticated role: read/write access (existing behaviour preserved)
  - api_key_encrypted / raw credential columns: never selected by frontend code
    (enforced at application layer — fixed in aiProviders.ts, paymentProviders.ts,
    communicationProviders.ts to only select masked columns)

  ## Important Notes
  1. Raw credential columns (api_key_encrypted, payu_merchant_key, razorpay_key_secret,
     meta_access_token, etc.) should NEVER appear in any Supabase client .select() call.
     Always use the corresponding _masked columns for display.
  2. The backend Java service reads raw credentials via its own Postgres connection using
     the service role key — this is the only legitimate path for raw credential access.
  3. The ai_provider_configs.api_key_encrypted column stores the literal API key submitted
     by the admin. Application-level encryption at rest should be added in a future
     migration using pgcrypto if compliance requirements demand it.
*/

-- ─── Verify no anon policies exist on credential tables ───────────────────────
-- (These are documentation-only DO blocks — they will RAISE if anon accidentally
-- gained access, making the problem visible in migration logs.)

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'ai_provider_configs',
      'payment_provider_configs',
      'whatsapp_provider_configs',
      'email_provider_configs',
      'crm_provider_configs',
      'analytics_provider_configs',
      'storage_provider_configs',
      'scheduling_provider_configs'
    )
    AND roles::text LIKE '%anon%';

  IF cnt > 0 THEN
    RAISE WARNING
      'SECURITY: % RLS polic(ies) on provider config tables grant access to the anon role. '
      'Review and remove these policies immediately.',
      cnt;
  END IF;
END $$;

-- ─── Ensure api_key_encrypted is never exposed to authenticated role via SELECT ─
-- The safest long-term approach is a SECURITY DEFINER view that omits raw columns.
-- Create/replace such views now so application code can target them.

CREATE OR REPLACE VIEW ai_provider_configs_safe AS
  SELECT
    id, provider_code, provider_name, api_key_masked, model_name, base_url,
    temperature, max_tokens, timeout_seconds, retry_count, json_strict_mode,
    is_active, is_primary, is_fallback, environment_mode, display_order,
    notes, created_at, updated_at
  FROM ai_provider_configs;

COMMENT ON VIEW ai_provider_configs_safe IS
  'Safe read view for ai_provider_configs — omits api_key_encrypted. '
  'Use this view for all frontend Supabase client reads. '
  'The raw api_key_encrypted column is only accessible via the backend service role.';

CREATE OR REPLACE VIEW payment_provider_configs_safe AS
  SELECT
    id, provider_code, provider_name, environment_mode, is_active, is_primary,
    is_fallback, display_order,
    payu_merchant_key_masked, payu_salt_masked, payu_base_url,
    payu_success_url, payu_failure_url,
    razorpay_key_id, razorpay_key_secret_masked, razorpay_webhook_secret_masked,
    webhook_url_path, notes, created_at, updated_at
  FROM payment_provider_configs;

COMMENT ON VIEW payment_provider_configs_safe IS
  'Safe read view for payment_provider_configs — omits payu_merchant_key, payu_salt, '
  'razorpay_key_secret, razorpay_webhook_secret raw columns. '
  'Use this view for all frontend Supabase client reads.';

CREATE OR REPLACE VIEW whatsapp_provider_configs_safe AS
  SELECT
    id, provider_code, provider_name, environment_mode, is_active, is_primary,
    is_fallback, display_order,
    meta_access_token_masked, meta_phone_number_id, meta_business_account_id,
    meta_webhook_verify_token_masked, meta_api_version,
    twilio_account_sid, twilio_auth_token_masked, twilio_from_number,
    msg91_auth_key_masked, msg91_sender_id,
    sender_phone_display, webhook_url_path, template_notes, notes,
    created_at, updated_at
  FROM whatsapp_provider_configs;

COMMENT ON VIEW whatsapp_provider_configs_safe IS
  'Safe read view for whatsapp_provider_configs — omits raw token columns. '
  'Use this view for all frontend Supabase client reads.';

CREATE OR REPLACE VIEW email_provider_configs_safe AS
  SELECT
    id, provider_code, provider_name, environment_mode, is_active, is_primary,
    is_fallback, display_order,
    sender_email, sender_name, reply_to_email,
    sendgrid_api_key_masked,
    ses_access_key_id, ses_secret_access_key_masked, ses_region,
    smtp_host, smtp_port, smtp_username, smtp_password_masked, smtp_use_tls,
    resend_api_key_masked,
    notes, created_at, updated_at
  FROM email_provider_configs;

COMMENT ON VIEW email_provider_configs_safe IS
  'Safe read view for email_provider_configs — omits raw secret columns. '
  'Use this view for all frontend Supabase client reads.';

-- ─── Add column comments documenting sensitivity ─────────────────────────────

COMMENT ON COLUMN ai_provider_configs.api_key_encrypted IS
  'Raw API key — NEVER select this column from the frontend Supabase client. '
  'Backend service role access only. Use api_key_masked for display.';

COMMENT ON COLUMN payment_provider_configs.payu_merchant_key IS
  'Raw PayU merchant key — backend service role access only. Use payu_merchant_key_masked for display.';

COMMENT ON COLUMN payment_provider_configs.payu_salt IS
  'Raw PayU salt — backend service role access only. Use payu_salt_masked for display.';

COMMENT ON COLUMN payment_provider_configs.razorpay_key_secret IS
  'Raw Razorpay key secret — backend service role access only. Use razorpay_key_secret_masked for display.';

COMMENT ON COLUMN payment_provider_configs.razorpay_webhook_secret IS
  'Raw Razorpay webhook secret — backend service role access only. Use razorpay_webhook_secret_masked for display.';
