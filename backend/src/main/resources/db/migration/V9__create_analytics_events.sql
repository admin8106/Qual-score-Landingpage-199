-- ============================================================
-- V9 — Create analytics_events table
--
-- Immutable append-only funnel event log. Records every named
-- event fired by the frontend or backend (page views, payment
-- steps, diagnostic progress, report views, bookings).
--
-- candidate_profile_id is nullable for pre-authentication events
-- (e.g. landing_page_view before any profile exists).
--
-- Metadata is stored as JSONB for flexible per-event properties.
--
-- Indexes:
--   analytics_events_event_name_idx         — filter by event name
--   analytics_events_created_at_idx         — time-range queries
--   analytics_events_candidate_profile_id_idx — per-candidate funnel
--   analytics_events_source_idx             — UTM source grouping
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID        REFERENCES candidate_profiles (id) ON DELETE SET NULL,
    event_name           VARCHAR(80) NOT NULL,
    source               VARCHAR(80),
    metadata_json        JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx          ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx          ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_candidate_profile_id_idx ON analytics_events (candidate_profile_id);
CREATE INDEX IF NOT EXISTS analytics_events_source_idx              ON analytics_events (source);

COMMENT ON TABLE  analytics_events                    IS 'Immutable append-only funnel event log — never update or delete rows';
COMMENT ON COLUMN analytics_events.event_name         IS 'e.g. landing_page_view, payment_verified, report_generated';
COMMENT ON COLUMN analytics_events.source             IS 'UTM source or anonymous session ID for pre-auth events';
COMMENT ON COLUMN analytics_events.metadata_json      IS 'Flexible per-event properties (score, band, page, etc.)';
