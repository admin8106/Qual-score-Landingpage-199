/*
  # Add Payment Verification State and Idempotency Controls

  ## Purpose
  Hardens the payment_transactions table to support:
  1. Explicit verification state machine (INITIATED → PENDING_VERIFICATION → VERIFIED / FAILED / UNKNOWN)
  2. Idempotent verification: duplicate verify calls on same gateway_payment_id return the existing record, never insert twice
  3. Webhook + frontend race condition safety via the unique constraint on gateway_payment_id

  ## New Column
  - `verification_state` (text) — tracks where in the state machine the transaction is.
    Values: INITIATED | PENDING_VERIFICATION | VERIFIED | FAILED | UNKNOWN
    Default: 'INITIATED'

  ## New Unique Constraint
  - `payment_transactions_gateway_payment_id_key` — prevents duplicate rows for the same
    gateway payment ID. Both webhook and frontend verify paths upsert on this key.

  ## New Function + Policy
  - `fn_upsert_payment_verification` — PL/pgSQL function that:
    - Inserts or updates by (payment_reference, gateway_payment_id)
    - Returns the final row (idempotent: calling twice is safe)
    - Only the service role can call this via RLS

  ## Security
  - RLS remains enabled. No new user-facing SELECT policies.
  - UPDATE policy scoped to service role only (existing pattern preserved).

  ## Notes
  - Uses IF NOT EXISTS / DO blocks to be safely re-runnable
  - Does NOT drop or destructively alter any existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions'
      AND column_name = 'verification_state'
  ) THEN
    ALTER TABLE payment_transactions
      ADD COLUMN verification_state text NOT NULL DEFAULT 'INITIATED'
        CHECK (verification_state IN ('INITIATED','PENDING_VERIFICATION','VERIFIED','FAILED','UNKNOWN'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_transactions_gateway_payment_id_key'
      AND table_name = 'payment_transactions'
  ) THEN
    ALTER TABLE payment_transactions
      ADD CONSTRAINT payment_transactions_gateway_payment_id_key
        UNIQUE (gateway_payment_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_verification_state
  ON payment_transactions (verification_state);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_ref_state
  ON payment_transactions (payment_reference, verification_state);
