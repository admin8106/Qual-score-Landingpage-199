-- ============================================================
-- V7 — Create consultation_bookings table
--
-- Records consultation slot requests made by candidates after
-- viewing their report. A candidate may rebook (multiple rows)
-- but only the latest REQUESTED/CONFIRMED row is active.
--
-- Indexes:
--   idx_cb_candidate_profile_id — all bookings per candidate
--   idx_cb_booking_status       — queue management (admin view)
--   idx_cb_preferred_date       — date-based calendar queries
-- ============================================================

CREATE TABLE IF NOT EXISTS consultation_bookings (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID        NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    preferred_date       VARCHAR(30) NOT NULL,
    preferred_time       VARCHAR(20) NOT NULL,
    notes                TEXT,
    booking_status       VARCHAR(20) NOT NULL DEFAULT 'REQUESTED'
                             CHECK (booking_status IN ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cb_candidate_profile_id ON consultation_bookings (candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_cb_booking_status       ON consultation_bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_cb_preferred_date       ON consultation_bookings (preferred_date);

COMMENT ON TABLE  consultation_bookings                   IS 'Consultation slot requests submitted by candidates';
COMMENT ON COLUMN consultation_bookings.preferred_date    IS 'Human-readable date string as submitted by the candidate';
COMMENT ON COLUMN consultation_bookings.preferred_time    IS 'Human-readable time slot as submitted by the candidate';
COMMENT ON COLUMN consultation_bookings.booking_status    IS 'REQUESTED → CONFIRMED → COMPLETED; or CANCELLED';
