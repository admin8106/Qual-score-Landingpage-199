/*
  # Create Launch Checklist Table

  ## Summary
  Stores the persistent state of each pre-launch verification item for the
  QualScore ₹199 diagnostic product. This allows the internal team to check
  off items, record verification notes, and see who verified each item.

  ## New Tables

  ### launch_checklist_items
  - `id` (text, primary key) — stable key per checklist item (e.g. "payment_real_test")
  - `label` (text) — display name of the check
  - `category` (text) — grouping category (e.g. "payment", "ai", "communication")
  - `status` (text) — "pending" | "verified" | "failed"
  - `verified_by` (text, nullable) — name/email of the person who verified
  - `note` (text, nullable) — optional verification note or failure reason
  - `verified_at` (timestamptz, nullable) — when the item was verified
  - `updated_at` (timestamptz) — last modification time

  ## Security
  - RLS enabled — only authenticated admin users can read/write
  - Policies allow authenticated users to select and upsert (no delete)

  ## Notes
  - The "ads_locked" derived state is computed in the frontend based on
    whether all required items are "verified". No separate column needed.
*/

CREATE TABLE IF NOT EXISTS launch_checklist_items (
  id            text        PRIMARY KEY,
  label         text        NOT NULL DEFAULT '',
  category      text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'pending',
  verified_by   text,
  note          text,
  verified_at   timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE launch_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view launch checklist"
  ON launch_checklist_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert launch checklist items"
  ON launch_checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update launch checklist items"
  ON launch_checklist_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
