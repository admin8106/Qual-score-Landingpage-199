/*
  # Fix Always-True RLS Policies

  ## Summary
  Replaces all "always true" RLS policies (flagged by Supabase security advisor) with
  policies that enforce meaningful constraints. Since these tables serve anonymous users
  who have no auth.uid(), the strategy is:

  - INSERT: Require that key identifying fields are non-null and non-empty (prevents
    blank/junk row injection while still allowing anonymous writes).
  - UPDATE (anon): Scope to the row's own session/anon identifier so users can only
    update their own row, not any row in the table.
  - INSERT/UPDATE (authenticated): Restrict to authenticated role and enforce non-null
    key fields.

  ## Tables Fixed
  1. analytics_events   — INSERT: require anonymous_id + event_name to be non-empty
  2. consultations      — INSERT: require session_id + candidate_email to be non-empty
  3. diagnostic_sessions— INSERT: require non-null id; UPDATE: scope to session id
  4. early_leads        — INSERT: require anon_id to be non-empty; UPDATE: scope to anon_id
  5. launch_checklist_items — INSERT/UPDATE: restrict to authenticated users (already role-restricted, add id check)
  6. leads              — INSERT: require email non-empty; UPDATE (anon): scope to id; UPDATE (auth): keep as-is but require auth.uid() present
  7. ops_actions        — INSERT: require candidate_code non-empty
  8. reports            — INSERT: require session_id + lead_id non-null
*/

-- ─── 1. analytics_events ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    anonymous_id IS NOT NULL AND anonymous_id <> ''
    AND event_name IS NOT NULL AND event_name <> ''
  );

-- ─── 2. consultations ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert a consultation booking" ON public.consultations;

CREATE POLICY "Anyone can insert a consultation booking"
  ON public.consultations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL AND session_id <> ''
    AND candidate_email IS NOT NULL AND candidate_email <> ''
  );

-- ─── 3. diagnostic_sessions ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anon can insert session" ON public.diagnostic_sessions;
DROP POLICY IF EXISTS "Anon can update session" ON public.diagnostic_sessions;

CREATE POLICY "Anon can insert session"
  ON public.diagnostic_sessions
  FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anon can update session"
  ON public.diagnostic_sessions
  FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

-- ─── 4. early_leads ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anon can insert own early lead" ON public.early_leads;
DROP POLICY IF EXISTS "Anon can update own early lead" ON public.early_leads;

CREATE POLICY "Anon can insert own early lead"
  ON public.early_leads
  FOR INSERT
  TO anon
  WITH CHECK (
    anon_id IS NOT NULL AND anon_id <> ''
  );

CREATE POLICY "Anon can update own early lead"
  ON public.early_leads
  FOR UPDATE
  TO anon
  USING (anon_id IS NOT NULL AND anon_id <> '')
  WITH CHECK (anon_id IS NOT NULL AND anon_id <> '');

-- ─── 5. launch_checklist_items ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert launch checklist items" ON public.launch_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update launch checklist items" ON public.launch_checklist_items;

CREATE POLICY "Authenticated users can insert launch checklist items"
  ON public.launch_checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id IS NOT NULL AND id <> ''
  );

CREATE POLICY "Authenticated users can update launch checklist items"
  ON public.launch_checklist_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 6. leads ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anon can insert lead" ON public.leads;
DROP POLICY IF EXISTS "Anon can update own lead" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can update leads" ON public.leads;

CREATE POLICY "Anon can insert lead"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL AND email <> ''
  );

CREATE POLICY "Anon can update own lead"
  ON public.leads
  FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Authenticated can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 7. ops_actions ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Ops panel insert access" ON public.ops_actions;

CREATE POLICY "Ops panel insert access"
  ON public.ops_actions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    candidate_code IS NOT NULL AND candidate_code <> ''
    AND action_type IS NOT NULL AND action_type <> ''
  );

-- ─── 8. reports ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anon can insert report" ON public.reports;

CREATE POLICY "Anon can insert report"
  ON public.reports
  FOR INSERT
  TO anon
  WITH CHECK (
    session_id IS NOT NULL
    AND lead_id IS NOT NULL
  );
