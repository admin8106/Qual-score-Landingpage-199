/*
  # Admin Roles and Permissions

  ## Summary
  Adds a fine-grained permission system for admin users.

  ## Changes

  ### `admin_users` table
  - Adds `role` column (SUPER_ADMIN | ADMIN | VIEWER) with default ADMIN
  - Adds `permissions` JSONB column for granular capability overrides

  ### `integration_config_audit_logs` table
  New table that persists every integration config change made through the
  admin dashboard frontend (Supabase-side audit trail, separate from backend).

  Columns:
  - `id`              — primary key
  - `actor_email`     — who made the change
  - `actor_role`      — their role at time of change
  - `provider_id`     — which provider config was affected (nullable for global actions)
  - `provider_name`   — snapshot of provider name
  - `category`        — snapshot of provider category
  - `action_type`     — e.g. CREDENTIAL_UPDATED, SETTINGS_UPDATED, PROVIDER_ENABLED, SET_PRIMARY, DELETE, etc.
  - `field_group`     — which group of fields changed (credentials, settings, status, primary, etc.)
  - `change_summary`  — plain-English summary of what changed (never includes secret values)
  - `environment_mode`— SANDBOX or LIVE
  - `created_at`      — when the change was made

  ## Security
  - RLS enabled on both tables.
  - Only authenticated users can insert/select audit logs.
  - No DELETE on audit logs — immutable historical record.
*/

-- ─── Role column on admin_users ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role text NOT NULL DEFAULT 'ADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ─── Integration config audit log table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_config_audit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email      text NOT NULL DEFAULT '',
  actor_role       text NOT NULL DEFAULT 'ADMIN',
  provider_id      text,
  provider_name    text,
  category         text,
  action_type      text NOT NULL,
  field_group      text NOT NULL DEFAULT 'general',
  change_summary   text NOT NULL DEFAULT '',
  environment_mode text NOT NULL DEFAULT 'SANDBOX',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_config_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert integration audit logs"
  ON integration_config_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read integration audit logs"
  ON integration_config_audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_integration_audit_actor   ON integration_config_audit_logs (actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_audit_provider ON integration_config_audit_logs (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_audit_action  ON integration_config_audit_logs (action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_audit_time    ON integration_config_audit_logs (created_at DESC);
