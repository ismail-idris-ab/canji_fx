-- Close a destructive function to the public.
--
-- purge_abandoned_anonymous_users() is SECURITY DEFINER and returns integer.
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and PostgREST
-- exposes every non-trigger function in the `public` schema as an RPC. The
-- combination meant any holder of the publishable anon key — which ships
-- inside the app bundle — could call it and irreversibly delete every
-- anonymous auth.users row older than 30 days holding no alert, cascading
-- their profiles, and flood system_events while doing it.
--
-- The function is only ever meant to run from pg_cron, which executes as the
-- database owner and is unaffected by these revocations.

revoke execute on function public.purge_abandoned_anonymous_users()
  from public, anon, authenticated;

-- Future functions in this schema inherit the same default, so the mistake is
-- worth blocking at source rather than only for this one function. Existing
-- functions are unaffected by this, hence the explicit revoke above.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- is_admin() stays callable on purpose: it returns only the calling user's own
-- flag, and the scrape-og Edge Function relies on invoking it as the caller.
-- It is re-granted explicitly so the default-privileges change above cannot
-- silently break it later.
grant execute on function public.is_admin() to authenticated;
