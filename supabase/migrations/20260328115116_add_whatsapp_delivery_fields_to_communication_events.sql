/*
  # Add WhatsApp delivery tracking fields to communication_events

  ## Summary
  Extends the communication_events table to support real WhatsApp message delivery
  tracking via the Meta WhatsApp Business Cloud API.

  ## New Columns

  ### communication_events
  - `idempotency_key` (text, nullable, unique)
      Composite key: candidateCode + "::" + templateCode.
      Prevents duplicate sends across retries or crashes.
      Indexed for fast deduplication lookups.

  - `provider_message_id` (text, nullable)
      The WAMID (WhatsApp message ID) returned by Meta after a successful send.
      Used to correlate delivery status webhook callbacks back to the event row.

  - `error_message` (text, nullable)
      Human-readable error description populated when delivery_status = FAILED.
      Sourced from the Meta API error response or an internal error string.

  ## New DeliveryStatus value
  The DeliveryStatus enum gains a PENDING value (managed in Java enum; no DB
  constraint change needed since the column is unconstrained string type).

  ## Indexes
  - idx_ce_idempotency_key  — unique index for O(1) duplicate detection
  - idx_ce_provider_msg_id  — non-unique index for webhook callback lookups
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_events' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE communication_events
      ADD COLUMN idempotency_key text;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ce_idempotency_key
      ON communication_events (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_events' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE communication_events
      ADD COLUMN provider_message_id text;

    CREATE INDEX IF NOT EXISTS idx_ce_provider_msg_id
      ON communication_events (provider_message_id)
      WHERE provider_message_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_events' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE communication_events
      ADD COLUMN error_message text;
  END IF;
END $$;
