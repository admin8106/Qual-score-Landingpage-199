-- V11: Add WhatsApp delivery tracking fields to communication_events
--
-- Adds idempotency_key, provider_message_id, and error_message columns to
-- support real Meta WhatsApp Business Cloud API integration.
-- See: WhatsAppNotificationService and WhatsAppWebhookController.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_events' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE communication_events ADD COLUMN idempotency_key varchar(120);
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
    ALTER TABLE communication_events ADD COLUMN provider_message_id varchar(120);
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
    ALTER TABLE communication_events ADD COLUMN error_message varchar(500);
  END IF;
END $$;
