/*
  # Provider Resolution Logs & Integration Feature Flags

  ## Summary
  Implements the database layer for dashboard-driven provider routing and operational control.

  ## New Tables

  ### 1. `integration_feature_flags`
  - Stores admin-controlled on/off switches for every integration category and sub-feature.
  - Each row is a unique named flag (e.g. `ai_enabled`, `whatsapp_send_enabled`).
  - Fields: flag_key (unique), flag_label, flag_description, is_enabled, is_critical,
    category, last_changed_by_email, last_changed_at, notes.

  ### 2. `provider_resolution_logs`
  - Audit trail of every runtime provider selection made by the system.
  - Records which category, environment, which provider was chosen, whether fallback was used,
    and the reason for selection or failure.
  - Fields: category, environment_mode, resolved_provider_id, resolved_provider_code,
    was_fallback, resolution_reason, trigger_context, created_at.

  ## Security
  - RLS enabled on both tables.
  - `integration_feature_flags`: authenticated users can SELECT; only service_role can INSERT/UPDATE/DELETE
    (flags are seeded by migration, then toggled via admin UI using service_role key via Supabase admin client).
    Since we use the anon key + RLS for the admin UI, we add explicit authenticated UPDATE policy for flags.
  - `provider_resolution_logs`: authenticated INSERT (system writes), authenticated SELECT (admin reads).

  ## Seed Data — Feature Flags
  Pre-populates all integration feature flags with safe defaults (most enabled for sandbox readiness).
*/

-- ─── integration_feature_flags ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_feature_flags (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key               text UNIQUE NOT NULL,
  flag_label             text NOT NULL,
  flag_description       text NOT NULL DEFAULT '',
  is_enabled             boolean NOT NULL DEFAULT true,
  is_critical            boolean NOT NULL DEFAULT false,
  category               text NOT NULL DEFAULT 'general',
  last_changed_by_email  text,
  last_changed_at        timestamptz,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feature flags"
  ON integration_feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update feature flags"
  ON integration_feature_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── provider_resolution_logs ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_resolution_logs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category                 text NOT NULL,
  environment_mode         text NOT NULL DEFAULT 'SANDBOX',
  resolved_provider_id     uuid,
  resolved_provider_code   text,
  resolved_provider_name   text,
  was_fallback             boolean NOT NULL DEFAULT false,
  resolution_status        text NOT NULL DEFAULT 'RESOLVED',
  resolution_reason        text,
  trigger_context          text,
  caller_ref               text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_resolution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert resolution logs"
  ON provider_resolution_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read resolution logs"
  ON provider_resolution_logs FOR SELECT
  TO authenticated
  USING (true);

-- ─── updated_at trigger for feature flags ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON integration_feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON integration_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();

-- ─── Seed: Feature Flags ─────────────────────────────────────────────────────

INSERT INTO integration_feature_flags
  (flag_key, flag_label, flag_description, is_enabled, is_critical, category)
VALUES
  -- AI / LLM
  ('ai_enabled',               'AI / LLM Enabled',             'Master switch for all LLM-based features (report generation, LinkedIn analysis)', true,  true,  'ai'),
  ('ai_fallback_to_template',  'AI Fallback to Template',       'When AI report generation fails, fall back to a pre-built template report',         true,  false, 'ai'),
  ('ai_linkedin_analysis',     'LinkedIn AI Analysis',          'Enable AI-powered LinkedIn profile analysis during diagnostic flow',                 true,  false, 'ai'),

  -- Payments
  ('payment_live_mode',        'Payment Live Mode',             'Enable real payment processing. When OFF, all payments are mocked/sandbox',         false, true,  'payments'),
  ('payment_webhook_verify',   'Payment Webhook Verification',  'Verify HMAC signatures on incoming payment gateway webhooks',                       true,  true,  'payments'),

  -- WhatsApp
  ('whatsapp_send_enabled',    'WhatsApp Send Enabled',         'Allow system to send WhatsApp messages via configured provider',                    true,  false, 'whatsapp'),
  ('whatsapp_report_notify',   'WhatsApp Report Notification',  'Send WhatsApp message when a candidate report is ready',                            true,  false, 'whatsapp'),
  ('whatsapp_booking_confirm', 'WhatsApp Booking Confirmation', 'Send WhatsApp confirmation when a consultation is booked',                          true,  false, 'whatsapp'),

  -- Email
  ('email_send_enabled',       'Email Send Enabled',            'Allow system to send emails via configured provider',                               true,  false, 'email'),
  ('email_report_notify',      'Email Report Notification',     'Send email when a candidate report is ready',                                       true,  false, 'email'),
  ('email_payment_confirm',    'Email Payment Confirmation',    'Send email receipt when payment is completed',                                      true,  false, 'email'),

  -- CRM
  ('crm_push_enabled',         'CRM Push Enabled',              'Push lead, score, and status updates to configured CRM provider',                   true,  false, 'crm'),
  ('crm_push_on_payment',      'CRM Push on Payment',           'Push to CRM when a payment is completed',                                           true,  false, 'crm'),
  ('crm_push_on_report',       'CRM Push on Report Ready',      'Push to CRM when a diagnostic report is generated',                                 true,  false, 'crm'),
  ('crm_push_on_booking',      'CRM Push on Booking',           'Push to CRM when a consultation is booked',                                         true,  false, 'crm'),

  -- Analytics
  ('analytics_push_enabled',   'Analytics Push Enabled',        'Fire analytics events to all active analytics providers (GA4, Meta Pixel, etc.)',   true,  false, 'analytics'),
  ('analytics_conversion_events', 'Analytics Conversion Events','Track payment and booking conversions in analytics providers',                       true,  false, 'analytics'),

  -- Storage
  ('storage_enabled',          'Storage Enabled',               'Allow system to read/write files to configured storage provider',                   true,  false, 'storage'),
  ('storage_report_persist',   'Persist Reports to Storage',    'Save generated diagnostic reports to storage for archival',                         false, false, 'storage'),

  -- Scheduling
  ('scheduling_enabled',       'Scheduling / Booking Enabled',  'Allow candidates to book consultations via configured scheduling provider',          true,  false, 'scheduling'),
  ('scheduling_reminders',     'Booking Reminders',             'Send automated reminders before scheduled consultations',                            true,  false, 'scheduling')

ON CONFLICT (flag_key) DO NOTHING;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON integration_feature_flags (category);
CREATE INDEX IF NOT EXISTS idx_resolution_logs_category ON provider_resolution_logs (category, environment_mode);
CREATE INDEX IF NOT EXISTS idx_resolution_logs_created_at ON provider_resolution_logs (created_at DESC);
