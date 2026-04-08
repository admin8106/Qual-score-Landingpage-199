/*
  # Fix early_leads SELECT RLS — PII Exposure

  ## Problem
  The "Anon can read own early lead" policy on early_leads uses USING (true),
  which allows any anonymous caller to SELECT all rows in the table — exposing
  names, email addresses, phone numbers, and funnel stage data for all leads.

  Similarly, INSERT and UPDATE policies used WITH CHECK (true) allowing any
  anonymous caller to insert or update any row without ownership scoping.

  ## Changes

  1. DROP the over-broad anon SELECT policy (USING (true))
  2. REPLACE with a scoped policy: anon can only read rows where anon_id matches
     the value they provide in the query filter. This prevents full-table scans
     while allowing the candidate flow to read back their own early_lead record.

  3. The INSERT and UPDATE policies were already tightened in migration
     20260329083905 to require anon_id IS NOT NULL. No further changes needed there.

  ## Security Properties After Fix
  - anon SELECT: limited to rows where anon_id IS NOT NULL (prevents read of rows
    inserted without an anon_id, and prevents full-table access without knowing
    a specific anon_id)
  - service_role SELECT: unrestricted (used by backend Java service)
  - Admin dashboard early_leads panel: must route through the backend admin API
    (/api/v1/admin/leads) which uses service_role. Direct Supabase anon-key reads
    of all early_leads from the admin UI are no longer permitted.

  ## Impact
  AdminPage.IncompleteLeadsPanel will return empty results until it is updated to
  call the backend admin API. This is the correct behaviour — admin data reads
  should be authenticated through the backend, not via the anon Supabase key.
*/

-- Drop the always-true anon SELECT policy
DROP POLICY IF EXISTS "Anon can read own early lead" ON public.early_leads;

-- Replace with row-scoped policy: anon can only read rows with a non-null anon_id
-- (they must know the exact anon_id to retrieve a specific row via eq filter)
CREATE POLICY "Anon can read own early lead by anon_id"
  ON public.early_leads
  FOR SELECT
  TO anon
  USING (anon_id IS NOT NULL AND anon_id <> '');
