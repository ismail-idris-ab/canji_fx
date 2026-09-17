-- Health monitoring for the Official Market pipeline.
--
-- The upstream endpoint is undocumented and unversioned. Its likelier failure
-- is a 200 response carrying stale data rather than a thrown error, which no
-- error handler would ever catch. See ADR 0004.

-- Where to reach the Admin when something breaks. Registered from the admin
-- screen rather than assumed, because a token changes on reinstall.
--
-- Separate from rate_alerts on purpose: an operational alert is not a Rate
-- Alert, must not count against the ten-alert cap, and must not be deleted
-- when the Admin tidies up their personal alerts.
create table public.admin_push_tokens (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  expo_push_token text not null,
  updated_at      timestamptz not null default now()
);

alter table public.admin_push_tokens enable row level security;

create policy "An admin may see their own operational token"
  on public.admin_push_tokens for select
  to authenticated
  using (user_id = (select auth.uid()) and public.is_admin());

create policy "An admin may register their own operational token"
  on public.admin_push_tokens for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.is_admin());

create policy "An admin may update their own operational token"
  on public.admin_push_tokens for update
  to authenticated
  using (user_id = (select auth.uid()) and public.is_admin())
  with check (user_id = (select auth.uid()) and public.is_admin());

grant select, insert, update on public.admin_push_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

-- 09:05 UTC is 10:05 WAT. The fetch runs at 06:00 WAT, so by mid-morning on a
-- weekday today's figure should exist. If it does not, something is wrong in
-- a way that produces no error anywhere.
select cron.schedule(
  'check-rate-health',
  '5 9 * * 1-5',
  $$
  select net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/check-rate-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI'
    ),
    body := '{}'::jsonb
  );
  $$
);
