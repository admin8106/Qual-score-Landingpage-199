/*
  # Create communication_events table (Flyway V8)

  1. New Tables
    - `communication_events` - Append-only audit log of outbound communication attempts

  2. Indexes
    - idx_ce_candidate_profile_id
    - idx_ce_event_type
    - idx_ce_channel_type
    - idx_ce_delivery_status

  3. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS communication_events (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID        REFERENCES candidate_profiles (id) ON DELETE SET NULL,
    event_type           VARCHAR(50) NOT NULL,
    channel_type         VARCHAR(20) NOT NULL
                             CHECK (channel_type IN ('EMAIL', 'WHATSAPP', 'SMS', 'SLACK', 'CRM', 'INTERNAL')),
    template_code        VARCHAR(80),
    payload_json         JSONB,
    delivery_status      VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                             CHECK (delivery_status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_candidate_profile_id ON communication_events (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_ce_event_type           ON communication_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ce_channel_type         ON communication_events (channel_type);
CREATE INDEX IF NOT EXISTS idx_ce_delivery_status      ON communication_events (delivery_status);

ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to communication_events"
  ON communication_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert communication_events"
  ON communication_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update communication_events"
  ON communication_events
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  communication_events                   IS 'Append-only audit log of all outbound communication attempts';
COMMENT ON COLUMN communication_events.event_type        IS 'Business trigger, e.g. REPORT_GENERATED, CONSULTATION_BOOKED';
COMMENT ON COLUMN communication_events.template_code     IS 'Template identifier, e.g. report_ready_wa, booking_confirmed_email';
COMMENT ON COLUMN communication_events.payload_json      IS 'Resolved template variables sent to the provider';
COMMENT ON COLUMN communication_events.delivery_status   IS 'QUEUED → SENT → DELIVERED; or FAILED/SKIPPED';
