-- ============================================================
-- V8 — Create communication_events table
--
-- Append-only audit log of every outbound communication attempt
-- (email, WhatsApp, CRM push, Slack alert, etc.) triggered by
-- business events in the diagnostic funnel.
--
-- Payload is stored as JSONB for structured template rendering.
-- Delivery status reflects the last known state from the provider.
--
-- Indexes:
--   idx_ce_candidate_profile_id — all comms for a candidate
--   idx_ce_event_type           — filter by trigger event
--   idx_ce_channel_type         — filter by delivery channel
--   idx_ce_delivery_status      — queue failed re-send jobs
-- ============================================================

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

COMMENT ON TABLE  communication_events                   IS 'Append-only audit log of all outbound communication attempts';
COMMENT ON COLUMN communication_events.event_type        IS 'Business trigger, e.g. REPORT_GENERATED, CONSULTATION_BOOKED';
COMMENT ON COLUMN communication_events.template_code     IS 'Template identifier, e.g. report_ready_wa, booking_confirmed_email';
COMMENT ON COLUMN communication_events.payload_json      IS 'Resolved template variables sent to the provider';
COMMENT ON COLUMN communication_events.delivery_status   IS 'QUEUED → SENT → DELIVERED; or FAILED/SKIPPED';
