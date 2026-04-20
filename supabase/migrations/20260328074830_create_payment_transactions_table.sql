/*
  # Create payment_transactions table

  ## Summary
  Production-grade payment transaction table for the QualScore frontend/Supabase stack.
  Supports multi-gateway integration (Razorpay, PayU, Mock), idempotent webhook processing,
  and full audit trail retention.

  ## New Table: payment_transactions

  ### Core fields
  - `id` (uuid, PK)
  - `payment_reference` (text, unique) — internal ref generated at initiation (PAY-xxxx)
  - `lead_id` (uuid, FK → leads) — links payment to a lead record
  - `gateway_name` (text) — "RAZORPAY" | "PAYU" | "MOCK"
  - `amount_paise` (integer) — amount in smallest currency unit (INR paise)
  - `currency` (text, default 'INR')
  - `status` (text) — INITIATED | VERIFIED | FAILED | REFUNDED

  ### Gateway fields
  - `gateway_order_id` (text) — provider order ID (e.g. order_xxx for Razorpay)
  - `gateway_payment_id` (text) — provider payment ID set after capture
  - `gateway_signature` (text) — HMAC signature from gateway callback
  - `gateway_order_raw_response` (text) — full JSON from order creation API

  ### Idempotency + audit
  - `webhook_event_id` (text, unique, nullable) — gateway event ID for webhook deduplication
  - `verified_at` (timestamptz, nullable) — timestamp of successful verification
  - `raw_payload` (text, nullable) — raw webhook/callback body for audit/replay

  ### Timestamps
  - `created_at` / `updated_at`

  ## Security
  - RLS enabled
  - No direct client access — all reads/writes go through backend service role
  - Policy: service role only (anon/authenticated have no access)
*/

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference         text NOT NULL UNIQUE,
  lead_id                   uuid REFERENCES leads(id),
  gateway_name              text NOT NULL DEFAULT 'MOCK',
  amount_paise              integer NOT NULL DEFAULT 0,
  currency                  text NOT NULL DEFAULT 'INR',
  status                    text NOT NULL DEFAULT 'INITIATED'
                              CHECK (status IN ('INITIATED','VERIFIED','FAILED','REFUNDED','SUCCESS')),
  gateway_order_id          text,
  gateway_payment_id        text,
  gateway_signature         text,
  gateway_order_raw_response text,
  webhook_event_id          text UNIQUE,
  verified_at               timestamptz,
  raw_payload               text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_lead_id
  ON payment_transactions(lead_id);

CREATE INDEX IF NOT EXISTS idx_pt_gateway_order_id
  ON payment_transactions(gateway_order_id);

CREATE INDEX IF NOT EXISTS idx_pt_gateway_payment_id
  ON payment_transactions(gateway_payment_id);

CREATE INDEX IF NOT EXISTS idx_pt_status
  ON payment_transactions(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_webhook_event_id
  ON payment_transactions(webhook_event_id)
  WHERE webhook_event_id IS NOT NULL;

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to payment_transactions"
  ON payment_transactions
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert payment_transactions"
  ON payment_transactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update payment_transactions"
  ON payment_transactions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
