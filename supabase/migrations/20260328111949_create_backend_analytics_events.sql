/*
  # Create backend analytics_events table (Flyway V9)

  Note: An analytics_events table already exists in this Supabase instance but with
  a different schema (uses anonymous_id, event_name, properties). The backend uses
  a different schema (candidate_profile_id, event_name, source, metadata_json).
  We create backend_analytics_events to avoid naming conflict.

  1. New Tables
    - `backend_analytics_events` - Immutable append-only funnel event log for backend tracking

  2. Indexes
    - backend_analytics_events_event_name_idx
    - backend_analytics_events_created_at_idx
    - backend_analytics_events_candidate_profile_id_idx
    - backend_analytics_events_source_idx

  3. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS backend_analytics_events (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID        REFERENCES candidate_profiles (id) ON DELETE SET NULL,
    event_name           VARCHAR(80) NOT NULL,
    source               VARCHAR(80),
    metadata_json        JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS backend_analytics_events_event_name_idx          ON backend_analytics_events (event_name);
CREATE INDEX IF NOT EXISTS backend_analytics_events_created_at_idx          ON backend_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS backend_analytics_events_candidate_profile_id_idx ON backend_analytics_events (candidate_profile_id);
CREATE INDEX IF NOT EXISTS backend_analytics_events_source_idx              ON backend_analytics_events (source);

ALTER TABLE backend_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to backend_analytics_events"
  ON backend_analytics_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert backend_analytics_events"
  ON backend_analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE  backend_analytics_events                    IS 'Immutable append-only funnel event log — never update or delete rows';
COMMENT ON COLUMN backend_analytics_events.event_name         IS 'e.g. landing_page_view, payment_verified, report_generated';
COMMENT ON COLUMN backend_analytics_events.source             IS 'UTM source or anonymous session ID for pre-auth events';
COMMENT ON COLUMN backend_analytics_events.metadata_json      IS 'Flexible per-event properties (score, band, page, etc.)';
