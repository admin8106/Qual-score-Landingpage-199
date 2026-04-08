/*
  # AI Provider Configuration Tables

  ## Purpose
  Enables admin-managed, database-driven LLM provider configuration so the
  backend dynamically reads the active AI provider settings instead of relying
  solely on environment variables. This allows zero-code provider switching.

  ## New Tables

  ### 1. ai_provider_configs
  Stores one record per LLM/AI provider configuration.
  - id                   — UUID primary key
  - provider_code        — Short identifier (openai, anthropic, gemini, deepseek, custom)
  - provider_name        — Display name ("OpenAI GPT-4o", etc.)
  - api_key_encrypted    — AES-256 encrypted API key (never returned as plaintext)
  - api_key_masked       — Last-4 + asterisks for UI display
  - model_name           — Model identifier (gpt-4o, claude-3-5-sonnet-20241022, etc.)
  - base_url             — Optional custom base URL (for custom/proxied endpoints)
  - temperature          — Sampling temperature (0.0–2.0), default 0.2
  - max_tokens           — Max tokens in response, default 2000
  - timeout_seconds      — Request timeout, default 60
  - retry_count          — Max retries on failure, default 1
  - json_strict_mode     — Whether to enforce response_format: json_object, default true
  - is_active            — Whether this provider is enabled, default false
  - is_primary           — Whether this is the currently active primary provider
  - is_fallback          — Whether to use as fallback when primary fails
  - environment_mode     — SANDBOX or LIVE
  - display_order        — Ordering in UI
  - notes                — Admin notes / usage description
  - created_at / updated_at

  ### 2. ai_report_generation_settings
  Single-row table for global report generation behavior settings.
  - id                   — UUID primary key
  - max_retries          — Max AI call retries per report generation attempt
  - fallback_to_template — Whether to fall back to rule-based when AI fails
  - validation_strictness — STRICT / LENIENT / OFF
  - default_temperature  — Global temperature override (null = per-provider value used)
  - prompt_version       — Currently active prompt version for report generation
  - model_usage_notes    — Admin notes about model usage / cost observations
  - updated_at           — Last updated timestamp
  - updated_by_admin_id  — Email of admin who last changed settings

  ### 3. ai_prompt_versions
  Registry of prompt versions. Enables future multi-version prompt management.
  - id                   — UUID primary key
  - version_code         — e.g. "B-1.1", "B-1.2"
  - version_label        — Human label ("Report Gen v1.1 — July 2026")
  - prompt_type          — REPORT_GEN, LINKEDIN_ANALYZER, etc.
  - is_active            — Whether this version is selectable
  - release_notes        — What changed in this version
  - created_at

  ### 4. ai_connection_test_logs
  Lightweight test ping results for AI providers.
  - id                   — UUID primary key
  - provider_config_id   — FK to ai_provider_configs
  - tested_by_admin_id   — Email of admin who triggered test
  - status               — SUCCESS / FAILURE / TIMEOUT
  - response_summary     — Short description of result
  - latency_ms           — Round-trip latency in milliseconds
  - created_at

  ## Security
  - RLS enabled on all tables
  - All policies restricted to authenticated Supabase users
  - API keys stored encrypted; masked version only shown in UI

  ## Important Notes
  1. The api_key_encrypted column stores the key encrypted by the backend
     before insert — the frontend NEVER receives or sends the raw key after save.
  2. Default seed row inserted into ai_report_generation_settings on migration.
  3. Default prompt versions B-1.1 and A-1.0 seeded into ai_prompt_versions.
*/

-- ─── ai_provider_configs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code       text NOT NULL,
  provider_name       text NOT NULL DEFAULT '',
  api_key_encrypted   text,
  api_key_masked      text,
  model_name          text NOT NULL DEFAULT 'gpt-4o',
  base_url            text,
  temperature         numeric(4,2) NOT NULL DEFAULT 0.2,
  max_tokens          integer NOT NULL DEFAULT 2000,
  timeout_seconds     integer NOT NULL DEFAULT 60,
  retry_count         integer NOT NULL DEFAULT 1,
  json_strict_mode    boolean NOT NULL DEFAULT true,
  is_active           boolean NOT NULL DEFAULT false,
  is_primary          boolean NOT NULL DEFAULT false,
  is_fallback         boolean NOT NULL DEFAULT false,
  environment_mode    text NOT NULL DEFAULT 'SANDBOX',
  display_order       integer NOT NULL DEFAULT 100,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai provider configs"
  ON ai_provider_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ai provider configs"
  ON ai_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ai provider configs"
  ON ai_provider_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ai provider configs"
  ON ai_provider_configs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider_code ON ai_provider_configs(provider_code);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_is_primary ON ai_provider_configs(is_primary) WHERE is_primary = true;

-- ─── ai_report_generation_settings ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_report_generation_settings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_retries             integer NOT NULL DEFAULT 1,
  fallback_to_template    boolean NOT NULL DEFAULT true,
  validation_strictness   text NOT NULL DEFAULT 'STRICT',
  default_temperature     numeric(4,2),
  prompt_version          text NOT NULL DEFAULT 'B-1.1',
  model_usage_notes       text,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id     text
);

ALTER TABLE ai_report_generation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read report gen settings"
  ON ai_report_generation_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert report gen settings"
  ON ai_report_generation_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update report gen settings"
  ON ai_report_generation_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO ai_report_generation_settings
  (max_retries, fallback_to_template, validation_strictness, prompt_version)
VALUES
  (1, true, 'STRICT', 'B-1.1')
ON CONFLICT DO NOTHING;

-- ─── ai_prompt_versions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code    text NOT NULL UNIQUE,
  version_label   text NOT NULL DEFAULT '',
  prompt_type     text NOT NULL DEFAULT 'REPORT_GEN',
  is_active       boolean NOT NULL DEFAULT true,
  release_notes   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prompt versions"
  ON ai_prompt_versions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert prompt versions"
  ON ai_prompt_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update prompt versions"
  ON ai_prompt_versions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO ai_prompt_versions (version_code, version_label, prompt_type, is_active, release_notes)
VALUES
  ('B-1.1', 'Report Generator v1.1 (Current)', 'REPORT_GEN', true,
   'Production prompt. Band-aware tone, 10-field JSON schema. Temperature 0.2, json_object mode.'),
  ('A-1.0', 'LinkedIn Analyzer v1.0', 'LINKEDIN_ANALYZER', true,
   'LinkedIn profile scoring prompt. 13 dimension scores. Currently backed by rule-based engine.')
ON CONFLICT (version_code) DO NOTHING;

-- ─── ai_connection_test_logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_connection_test_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_config_id  uuid NOT NULL REFERENCES ai_provider_configs(id) ON DELETE CASCADE,
  tested_by_admin_id  text,
  status              text NOT NULL DEFAULT 'PENDING',
  response_summary    text,
  latency_ms          integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_connection_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai test logs"
  ON ai_connection_test_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ai test logs"
  ON ai_connection_test_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_ai_test_logs_provider_id ON ai_connection_test_logs(provider_config_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_created_at ON ai_connection_test_logs(created_at DESC);

-- ─── updated_at trigger for ai_provider_configs ───────────────────────────────

CREATE OR REPLACE FUNCTION update_ai_provider_config_updated_at()
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

CREATE TRIGGER ai_provider_configs_updated_at
  BEFORE UPDATE ON ai_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_ai_provider_config_updated_at();
