/*
  # Add RETRIED delivery status index

  ## Summary
  Adds a partial index to efficiently query communication events that are in
  RETRIED status, supporting admin dashboards and retry audits. No schema
  changes are required since delivery_status is stored as text.

  ## Changes
  - New partial index: idx_comm_events_retried on communication_events(candidate_profile_id)
    where delivery_status = 'RETRIED'
*/

CREATE INDEX IF NOT EXISTS idx_comm_events_retried
  ON communication_events (candidate_profile_id)
  WHERE delivery_status = 'RETRIED';

CREATE INDEX IF NOT EXISTS idx_comm_events_failed
  ON communication_events (candidate_profile_id)
  WHERE delivery_status IN ('FAILED', 'RETRIED');
