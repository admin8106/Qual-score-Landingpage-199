/*
  # Fix Mutable search_path on update_early_leads_updated_at

  ## Summary
  Sets a fixed search_path on the `update_early_leads_updated_at` trigger function
  to prevent search_path injection attacks. A mutable search_path allows an attacker
  with CREATE privilege on any schema to shadow system functions.

  ## Changes
  - Recreates `public.update_early_leads_updated_at` with `SET search_path = public, pg_catalog`
    and `SECURITY DEFINER` replaced by `SECURITY INVOKER` (trigger functions don't need definer)

  ## Security
  - Fixes: "Function search_path mutable" advisory from Supabase security advisor
*/

CREATE OR REPLACE FUNCTION public.update_early_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
