/*
  # Create analytics_events table

  ## Purpose
  Stores all funnel analytics events fired by the QualScore diagnostic product.
  Powers the internal funnel analytics dashboard and supports future integration
  with GA4, Mixpanel, and Meta Pixel.

  ## New Tables

  ### analytics_events
  - `id` (uuid, primary key) — unique event ID
  - `event_name` (text, not null) — one of the 12 funnel event names
  - `properties` (jsonb) — arbitrary key-value metadata for the event
  - `anonymous_id` (text) — browser-generated anonymous user identity
  - `occurred_at` (timestamptz) — when the event was fired (client time)
  - `created_at` (timestamptz) — when the record was inserted (server time)

  ## Security
  - RLS enabled
  - Anonymous INSERT allowed (no auth required — events fire from unauthenticated users)
  - SELECT restricted to authenticated users only (admin access)
  - No UPDATE or DELETE policies (events are immutable append-only records)

  ## Notes
  - No foreign key to leads — events may fire before a lead record exists
  - `anonymous_id` links events across the same browser session
  - `properties.lead_id` and `properties.session_id` allow joining to leads table post-hoc
  - Index on event_name and occurred_at for fast aggregation queries
*/

CREATE TABLE IF NOT EXISTS analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    text NOT NULL,
  properties    jsonb DEFAULT '{}',
  anonymous_id  text NOT NULL DEFAULT '',
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx ON analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_anonymous_id_idx ON analytics_events (anonymous_id);
