-- Operational event log and the scheduled Official Market fetch.

-- ---------------------------------------------------------------------------
-- system_events
-- ---------------------------------------------------------------------------

-- The upstream CBN endpoint is undocumented and unversioned, and its likelier
-- failure is a 200 response carrying stale or reshaped data rather than a
-- thrown error. Incidents are recorded here so a silent break becomes
-- visible. See ADR 0004.
create table public.system_events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index system_events_recent_idx
  on public.system_events (created_at desc);

alter table public.system_events enable row level security;

-- Operational detail is for the Admin, not for Readers.
create policy "Admins may read system events"
  on public.system_events for select
  to authenticated
  using (public.is_admin());

grant select on public.system_events to authenticated;

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Three times per weekday at 06:00, 12:00 and 18:00 WAT. Times are stored in
-- UTC and Nigeria is permanently UTC+1 with no daylight saving, so these are
-- 05:00, 11:00 and 17:00 UTC.
--
-- Hourly polling was rejected: the source publishes once per weekday, so it
-- would buy nothing and triple the exposure to an undocumented endpoint.
--
-- The call carries only the publishable anon key. The function reads the
-- service role key from its own environment instead, so no secret appears in
-- cron.job, which anything able to reach the cron schema can read.
select cron.schedule(
  'fetch-cbn-rates',
  '0 5,11,17 * * 1-5',
  $$
  select net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/fetch-cbn-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI'
    ),
    body := '{}'::jsonb
  );
  $$
);
