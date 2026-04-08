/*
  # Create backend payment_transactions table (Flyway V2)

  This is the backend-managed payment_transactions table that references candidate_profiles.
  Note: A payment_transactions table already exists in this Supabase instance (from earlier migrations)
  but it has a different schema (references leads, not candidate_profiles). We create a new table
  named candidate_payment_transactions to avoid conflict.

  1. New Tables
    - `candidate_payment_transactions` - Immutable audit trail of payment attempts linked to candidate_profiles

  2. Indexes
    - payment_reference (unique)
    - candidate_profile_id
    - gateway_order_id
    - status

  3. Security
    - Enable RLS
    - Service role only
*/

CREATE TABLE IF NOT EXISTS candidate_payment_transactions (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference    VARCHAR(60)    NOT NULL UNIQUE,
    candidate_profile_id UUID           REFERENCES candidate_profiles (id) ON DELETE SET NULL,
    gateway_name         VARCHAR(40)    NOT NULL,
    amount               NUMERIC(12, 2) NOT NULL,
    currency             VARCHAR(5)     NOT NULL DEFAULT 'INR',
    status               VARCHAR(20)    NOT NULL DEFAULT 'INITIATED'
                             CHECK (status IN ('INITIATED', 'SUCCESS', 'FAILED', 'VERIFIED', 'REFUNDED')),
    gateway_order_id     VARCHAR(100),
    gateway_payment_id   VARCHAR(100),
    gateway_signature    VARCHAR(512),
    gateway_order_raw_response TEXT,
    webhook_event_id     VARCHAR(200)   UNIQUE,
    verified_at          TIMESTAMPTZ,
    raw_payload          JSONB,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpt_payment_reference    ON candidate_payment_transactions (payment_reference);
CREATE        INDEX IF NOT EXISTS idx_cpt_candidate_profile_id ON candidate_payment_transactions (candidate_profile_id);
CREATE        INDEX IF NOT EXISTS idx_cpt_gateway_order_id     ON candidate_payment_transactions (gateway_order_id);
CREATE        INDEX IF NOT EXISTS idx_cpt_status               ON candidate_payment_transactions (status);

ALTER TABLE candidate_payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to candidate_payment_transactions"
  ON candidate_payment_transactions
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert candidate_payment_transactions"
  ON candidate_payment_transactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update candidate_payment_transactions"
  ON candidate_payment_transactions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE  candidate_payment_transactions                   IS 'Audit trail of every payment attempt linked to candidate_profiles';
COMMENT ON COLUMN candidate_payment_transactions.payment_reference IS 'Backend-generated unique ref (e.g. PAY-20240101-XYZ)';
COMMENT ON COLUMN candidate_payment_transactions.raw_payload       IS 'Full gateway webhook or response payload for debugging';
