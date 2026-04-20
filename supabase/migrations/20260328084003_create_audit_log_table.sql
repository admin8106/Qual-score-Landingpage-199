/*
  # Create audit_log table

  ## Purpose
  Persistent structured audit trail for all critical business events in the
  QualScore Employability Diagnostic platform.

  ## New Tables

  ### `audit_log`
  Stores one record per auditable event with:
  - `id`            (uuid, PK) — surrogate key
  - `event_type`    (text, NOT NULL) — enum-style label e.g. PAYMENT_VERIFIED
  - `actor_id`      (text) — user/service that triggered the event (email, candidateCode, "ADMIN", "SYSTEM")
  - `resource_type` (text) — entity category e.g. PaymentTransaction, CandidateProfile
  - `resource_id`   (text) — specific entity identifier e.g. PAY-xxxxxxxx
  - `outcome`       (text, NOT NULL) — SUCCESS | FAILURE | SKIPPED
  - `request_id`    (text) — correlation UUID from X-Request-Id header
  - `remote_ip`     (text) — client IP resolved from X-Forwarded-For or socket
  - `metadata`      (jsonb) — arbitrary event-specific key-value pairs (no secrets)
  - `occurred_at`   (timestamptz, NOT NULL, DEFAULT now()) — event timestamp

  ## Indexes
  - `idx_audit_log_event_type`   — for filtering by event category
  - `idx_audit_log_actor_id`     — for per-user audit trails
  - `idx_audit_log_resource`     — composite on (resource_type, resource_id) for entity history
  - `idx_audit_log_occurred_at`  — for time-range queries and retention cleanup
  - `idx_audit_log_outcome`      — for failure/skipped alerting queries

  ## Security
  - RLS is enabled on `audit_log`
  - service_role can SELECT, INSERT (write audit events from backend)
  - No UPDATE or DELETE policy — audit records are immutable by design
  - anon and authenticated roles have no access

  ## Notes
  1. This table is the persistence target for AuditLogServiceImpl extension point.
  2. The Java backend writes via service_role key (SUPABASE_SERVICE_ROLE_KEY).
  3. `metadata` is jsonb — indexed for full-text search if needed later.
  4. No UPDATE/DELETE policies are intentional: audit logs must not be mutated.
  5. Retention policy: implement a scheduled purge of rows older than 90 days
     via a pg_cron job or Supabase Edge Function cron if required.
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text        NOT NULL,
  actor_id      text,
  resource_type text,
  resource_id   text,
  outcome       text        NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'SKIPPED')),
  request_id    text,
  remote_ip     text,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type  ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id    ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource    ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_outcome     ON audit_log (outcome) WHERE outcome IN ('FAILURE', 'SKIPPED');

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role can insert audit events"
  ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role can read audit log"
  ON audit_log
  FOR SELECT
  TO service_role
  USING (true);
