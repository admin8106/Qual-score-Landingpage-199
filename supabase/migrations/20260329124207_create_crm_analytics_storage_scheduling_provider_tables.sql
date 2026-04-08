/*
  # Provider Config Tables: CRM, Analytics, Storage, Scheduling

  ## Purpose
  Extends the Integration Control Center with database-driven configuration for four
  additional provider categories: CRM, Analytics, Storage, and Scheduling/Calendar.
  Admins can switch providers and manage credentials without code changes.

  ## New Tables

  ### 1. crm_provider_configs
  Stores CRM gateway configs (Zoho, HubSpot, Salesforce, Webhook).
  - provider_code: zoho, hubspot, salesforce, webhook, stub
  - base_url / instance_url: API root for the CRM
  - auth_token / client_id / client_secret: credentials (masked)
  - mapping_mode: FIELD_MAP | WEBHOOK_PUSH | NATIVE_SDK
  - sync_contact / sync_deal / sync_activity: per-object sync toggles
  - pipeline_id / owner_id: CRM routing defaults
  - custom_field_mappings: JSON for flexible field mapping
  - is_active, is_primary, is_fallback, environment_mode

  ### 2. analytics_provider_configs
  Stores tracking pixel / SDK configuration.
  - provider_code: ga4, meta_pixel, mixpanel, stub
  - measurement_id / tracking_id: GA4 Measurement ID (G-XXXXXX)
  - api_secret: GA4 Measurement Protocol secret
  - pixel_id: Meta Pixel numeric ID
  - access_token: Meta CAPI token
  - mixpanel_token: project token
  - event_mappings: JSON event-name overrides
  - is_active, environment_mode
  - No primary/fallback — all active providers fire simultaneously

  ### 3. storage_provider_configs
  Stores object/file storage configs.
  - provider_code: local, supabase_storage, s3, stub
  - bucket_name: S3 bucket or Supabase storage bucket
  - region: AWS region
  - access_key_id / secret_access_key (masked)
  - endpoint_url: custom endpoint for S3-compatible stores (MinIO, R2, etc.)
  - public_base_url: CDN/public URL prefix for stored objects
  - prefix: optional key prefix
  - is_active, is_primary, is_fallback, environment_mode

  ### 4. scheduling_provider_configs
  Stores calendar/scheduling integration configs.
  - provider_code: google_calendar, calendly, stub
  - calendar_id: Google Calendar ID or Calendly account handle
  - oauth_access_token / oauth_refresh_token (masked)
  - api_key: provider API key (Calendly PAT)
  - webhook_signing_secret (masked)
  - booking_url: public booking/event URL for Calendly
  - event_type_uri: Calendly event type URI
  - timezone: default timezone
  - is_active, is_primary, is_fallback, environment_mode

  ### 5. Extended test log support
  The existing communication_config_test_logs table is reused by channel type.
  A new generic_provider_test_logs table covers CRM, Analytics, Storage, Scheduling.

  ## Security
  - RLS enabled on all tables, restricted to authenticated users
  - Raw secrets never returned to frontend; masked values used for display
  - Seed stub rows for each category

  ## Notes
  1. Only application logic enforces single-primary per environment.
  2. analytics_provider_configs has no primary/fallback — all fire in parallel.
  3. All masked columns store only the display-safe string; raw columns store the actual secret.
*/

-- ─── crm_provider_configs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_provider_configs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code             text NOT NULL DEFAULT 'stub',
  provider_name             text NOT NULL DEFAULT '',
  environment_mode          text NOT NULL DEFAULT 'SANDBOX',
  is_active                 boolean NOT NULL DEFAULT false,
  is_primary                boolean NOT NULL DEFAULT false,
  is_fallback               boolean NOT NULL DEFAULT false,
  display_order             integer NOT NULL DEFAULT 100,

  base_url                  text,
  instance_url              text,

  auth_token                text,
  auth_token_masked         text,
  client_id                 text,
  client_secret             text,
  client_secret_masked      text,
  api_key                   text,
  api_key_masked            text,

  mapping_mode              text NOT NULL DEFAULT 'WEBHOOK_PUSH',
  sync_contact              boolean NOT NULL DEFAULT true,
  sync_deal                 boolean NOT NULL DEFAULT false,
  sync_activity             boolean NOT NULL DEFAULT false,
  pipeline_id               text,
  owner_id                  text,
  custom_field_mappings     jsonb DEFAULT '{}'::jsonb,

  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read crm configs"
  ON crm_provider_configs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users insert crm configs"
  ON crm_provider_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update crm configs"
  ON crm_provider_configs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete crm configs"
  ON crm_provider_configs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_crm_configs_code    ON crm_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_crm_configs_primary ON crm_provider_configs(is_primary) WHERE is_primary = true;

-- ─── analytics_provider_configs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_provider_configs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code             text NOT NULL DEFAULT 'stub',
  provider_name             text NOT NULL DEFAULT '',
  environment_mode          text NOT NULL DEFAULT 'SANDBOX',
  is_active                 boolean NOT NULL DEFAULT false,
  display_order             integer NOT NULL DEFAULT 100,

  measurement_id            text,
  api_secret                text,
  api_secret_masked         text,

  pixel_id                  text,
  access_token              text,
  access_token_masked       text,
  test_event_code           text,

  mixpanel_token            text,
  mixpanel_token_masked     text,
  mixpanel_region           text DEFAULT 'US',

  event_mappings            jsonb DEFAULT '{}'::jsonb,
  notes                     text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read analytics configs"
  ON analytics_provider_configs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users insert analytics configs"
  ON analytics_provider_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update analytics configs"
  ON analytics_provider_configs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete analytics configs"
  ON analytics_provider_configs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_analytics_configs_code ON analytics_provider_configs(provider_code);

-- ─── storage_provider_configs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS storage_provider_configs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code             text NOT NULL DEFAULT 'stub',
  provider_name             text NOT NULL DEFAULT '',
  environment_mode          text NOT NULL DEFAULT 'SANDBOX',
  is_active                 boolean NOT NULL DEFAULT false,
  is_primary                boolean NOT NULL DEFAULT false,
  is_fallback               boolean NOT NULL DEFAULT false,
  display_order             integer NOT NULL DEFAULT 100,

  bucket_name               text,
  region                    text DEFAULT 'ap-south-1',
  access_key_id             text,
  secret_access_key         text,
  secret_access_key_masked  text,
  endpoint_url              text,
  public_base_url           text,
  key_prefix                text,

  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE storage_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read storage configs"
  ON storage_provider_configs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users insert storage configs"
  ON storage_provider_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update storage configs"
  ON storage_provider_configs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete storage configs"
  ON storage_provider_configs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_storage_configs_code    ON storage_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_storage_configs_primary ON storage_provider_configs(is_primary) WHERE is_primary = true;

-- ─── scheduling_provider_configs ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduling_provider_configs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code               text NOT NULL DEFAULT 'stub',
  provider_name               text NOT NULL DEFAULT '',
  environment_mode            text NOT NULL DEFAULT 'SANDBOX',
  is_active                   boolean NOT NULL DEFAULT false,
  is_primary                  boolean NOT NULL DEFAULT false,
  is_fallback                 boolean NOT NULL DEFAULT false,
  display_order               integer NOT NULL DEFAULT 100,

  calendar_id                 text,
  oauth_access_token          text,
  oauth_access_token_masked   text,
  oauth_refresh_token         text,
  oauth_refresh_token_masked  text,
  api_key                     text,
  api_key_masked              text,
  webhook_signing_secret      text,
  webhook_signing_secret_masked text,
  booking_url                 text,
  event_type_uri              text,
  timezone                    text DEFAULT 'Asia/Kolkata',

  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduling_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read scheduling configs"
  ON scheduling_provider_configs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users insert scheduling configs"
  ON scheduling_provider_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update scheduling configs"
  ON scheduling_provider_configs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete scheduling configs"
  ON scheduling_provider_configs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_scheduling_configs_code    ON scheduling_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_scheduling_configs_primary ON scheduling_provider_configs(is_primary) WHERE is_primary = true;

-- ─── generic_provider_test_logs ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generic_provider_test_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category             text NOT NULL,
  provider_config_id   uuid NOT NULL,
  tested_by_admin_id   text,
  status               text NOT NULL DEFAULT 'PENDING',
  summary              text,
  checks_run           jsonb DEFAULT '[]'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generic_provider_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read generic test logs"
  ON generic_provider_test_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users insert generic test logs"
  ON generic_provider_test_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_gen_test_logs_provider  ON generic_provider_test_logs(provider_config_id);
CREATE INDEX IF NOT EXISTS idx_gen_test_logs_category  ON generic_provider_test_logs(category);
CREATE INDEX IF NOT EXISTS idx_gen_test_logs_created   ON generic_provider_test_logs(created_at DESC);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_crm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_catalog AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER crm_provider_configs_updated_at
  BEFORE UPDATE ON crm_provider_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at_crm();

CREATE OR REPLACE FUNCTION set_updated_at_analytics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_catalog AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER analytics_provider_configs_updated_at
  BEFORE UPDATE ON analytics_provider_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at_analytics();

CREATE OR REPLACE FUNCTION set_updated_at_storage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_catalog AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER storage_provider_configs_updated_at
  BEFORE UPDATE ON storage_provider_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at_storage();

CREATE OR REPLACE FUNCTION set_updated_at_scheduling()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_catalog AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER scheduling_provider_configs_updated_at
  BEFORE UPDATE ON scheduling_provider_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at_scheduling();

-- ─── Seed stub rows ───────────────────────────────────────────────────────────

INSERT INTO crm_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, mapping_mode, notes, display_order
) VALUES (
  'stub', 'Stub (Development)', 'SANDBOX',
  true, true, 'WEBHOOK_PUSH',
  'Built-in stub. Logs CRM pushes to console. Replace with Zoho or HubSpot for production.', 999
) ON CONFLICT DO NOTHING;

INSERT INTO analytics_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, notes, display_order
) VALUES (
  'stub', 'Stub (Development)', 'SANDBOX',
  true,
  'Built-in stub. Analytics events logged to console only.', 999
) ON CONFLICT DO NOTHING;

INSERT INTO storage_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, notes, display_order
) VALUES (
  'supabase_storage', 'Supabase Storage (Default)', 'SANDBOX',
  true, true,
  'Uses the built-in Supabase Storage. No additional credentials required.', 1
) ON CONFLICT DO NOTHING;

INSERT INTO scheduling_provider_configs (
  provider_code, provider_name, environment_mode,
  is_active, is_primary, notes, display_order
) VALUES (
  'stub', 'Stub (Development)', 'SANDBOX',
  true, true,
  'Built-in stub. Booking flow uses internal Supabase consultations table. Replace with Calendly for production.', 999
) ON CONFLICT DO NOTHING;
