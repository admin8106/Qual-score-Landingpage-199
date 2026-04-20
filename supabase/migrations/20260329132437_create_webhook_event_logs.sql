/*
  # Webhook Event Logs — Inbound Callback Tracking

  ## Summary
  Creates the `webhook_event_logs` table to persist every inbound webhook call received
  from external providers (payment gateways, WhatsApp, email, CRM, analytics, etc.).
  This powers the Webhook Manager admin screen — giving ops/admin full visibility into
  callback delivery, processing status, failures, and replay capability.

  ## New Tables

  ### `webhook_event_logs`
  One row per inbound webhook event received from any external provider.

  Columns:
  - `id`                 — primary key (UUID)
  - `endpoint_slug`      — identifies which registered endpoint received the call
                           e.g. "payments-razorpay", "whatsapp-meta", "crm-hubspot"
  - `category`           — provider category (payments, whatsapp, email, crm, analytics, scheduling)
  - `provider_code`      — provider code snapshot (razorpay, meta, resend, etc.)
  - `provider_name`      — human-readable provider name snapshot
  - `environment_mode`   — SANDBOX or LIVE
  - `event_type`         — event name from the provider (e.g. "payment.captured", "message.delivered")
  - `idempotency_key`    — dedup key (provider order/message/event ID); UNIQUE per endpoint_slug
  - `status`             — RECEIVED | PROCESSING | SUCCESS | FAILED | REPLAYED | SKIPPED
  - `http_method`        — HTTP method of the incoming request
  - `source_ip`          — IP address of the caller (for security audit)
  - `raw_headers`        — JSONB snapshot of relevant request headers
  - `raw_payload`        — JSONB snapshot of the request body (sanitised, no PII)
  - `processing_summary` — human-readable outcome (1-2 sentences)
  - `error_detail`       — full error if processing failed
  - `retry_count`        — how many times this event has been replayed
  - `last_replayed_at`   — timestamp of most recent replay attempt
  - `replayed_by_email`  — admin email who triggered replay
  - `received_at`        — when the webhook was received
  - `processed_at`       — when processing completed (or null if still pending)
  - `created_at`         — row creation time (same as received_at normally)

  ## Security
  - RLS enabled.
  - Authenticated users can SELECT (admin reads logs) and INSERT (system writes).
  - Authenticated users can UPDATE (for replay status updates and retry counts).
  - No DELETE — logs are immutable historical records.

  ## Indexes
  - endpoint_slug + received_at DESC for per-endpoint log views
  - category + received_at DESC for category filtering
  - status for filtering failed/successful events
  - idempotency_key + endpoint_slug UNIQUE to prevent duplicate processing
  - received_at DESC for recency ordering in the main log view
*/

CREATE TABLE IF NOT EXISTS webhook_event_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_slug        text NOT NULL,
  category             text NOT NULL,
  provider_code        text NOT NULL DEFAULT '',
  provider_name        text NOT NULL DEFAULT '',
  environment_mode     text NOT NULL DEFAULT 'SANDBOX',
  event_type           text NOT NULL DEFAULT 'unknown',
  idempotency_key      text,
  status               text NOT NULL DEFAULT 'RECEIVED',
  http_method          text NOT NULL DEFAULT 'POST',
  source_ip            text,
  raw_headers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_summary   text,
  error_detail         text,
  retry_count          integer NOT NULL DEFAULT 0,
  last_replayed_at     timestamptz,
  replayed_by_email    text,
  received_at          timestamptz NOT NULL DEFAULT now(),
  processed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert webhook logs"
  ON webhook_event_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read webhook logs"
  ON webhook_event_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update webhook logs"
  ON webhook_event_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Unique index to enforce idempotency per endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_idempotency
  ON webhook_event_logs (endpoint_slug, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_endpoint_time  ON webhook_event_logs (endpoint_slug, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_category_time  ON webhook_event_logs (category, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status         ON webhook_event_logs (status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at    ON webhook_event_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_code  ON webhook_event_logs (provider_code, received_at DESC);

-- ─── Seed: a few simulated historical records to populate the UI on first load ─

INSERT INTO webhook_event_logs
  (endpoint_slug, category, provider_code, provider_name, environment_mode, event_type, idempotency_key, status, http_method, raw_headers, raw_payload, processing_summary, received_at, processed_at)
VALUES
  (
    'payments-razorpay',
    'payments',
    'razorpay',
    'Razorpay',
    'SANDBOX',
    'payment.captured',
    'pay_seed_001',
    'SUCCESS',
    'POST',
    '{"content-type": "application/json", "x-razorpay-event-id": "ev_seed_001"}'::jsonb,
    '{"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_seed_001", "amount": 49900, "currency": "INR"}}}}'::jsonb,
    'Payment capture event processed successfully. Order marked as PAID.',
    now() - interval '2 hours',
    now() - interval '2 hours' + interval '320 milliseconds'
  ),
  (
    'payments-razorpay',
    'payments',
    'razorpay',
    'Razorpay',
    'SANDBOX',
    'payment.failed',
    'pay_seed_002',
    'SUCCESS',
    'POST',
    '{"content-type": "application/json", "x-razorpay-event-id": "ev_seed_002"}'::jsonb,
    '{"event": "payment.failed", "payload": {"payment": {"entity": {"id": "pay_seed_002", "error_code": "BAD_REQUEST_ERROR"}}}}'::jsonb,
    'Payment failure event processed. Order status updated to FAILED.',
    now() - interval '5 hours',
    now() - interval '5 hours' + interval '210 milliseconds'
  ),
  (
    'whatsapp-meta',
    'whatsapp',
    'meta',
    'WhatsApp (Meta Cloud)',
    'SANDBOX',
    'message.delivered',
    'wamid_seed_001',
    'SUCCESS',
    'POST',
    '{"content-type": "application/json"}'::jsonb,
    '{"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {"statuses": [{"id": "wamid_seed_001", "status": "delivered"}]}}]}]}'::jsonb,
    'Delivery status update received. Message marked as delivered.',
    now() - interval '1 hour',
    now() - interval '1 hour' + interval '55 milliseconds'
  ),
  (
    'payments-razorpay',
    'payments',
    'razorpay',
    'Razorpay',
    'SANDBOX',
    'payment.captured',
    'pay_seed_003',
    'FAILED',
    'POST',
    '{"content-type": "application/json", "x-razorpay-signature": "invalid"}'::jsonb,
    '{"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_seed_003"}}}}'::jsonb,
    'Signature verification failed. Event rejected.',
    now() - interval '30 minutes',
    now() - interval '30 minutes' + interval '40 milliseconds'
  )
ON CONFLICT DO NOTHING;
