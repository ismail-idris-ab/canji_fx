-- Push delivery receipts.
--
-- Expo returns a ticket per message immediately, and the real outcome only
-- some minutes later via a receipt. Without checking receipts, a token that
-- has been uninstalled stays on the list forever and every future send wastes
-- a slot on it. DeviceNotRegistered is the signal that an alert should stop.

create table public.push_tickets (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   text not null unique,
  alert_id    uuid references public.rate_alerts (id) on delete cascade,
  resolved_at timestamptz,
  outcome     text,
  created_at  timestamptz not null default now()
);

-- The receipt job only ever wants unresolved tickets old enough to have an
-- answer.
create index push_tickets_pending_idx
  on public.push_tickets (created_at)
  where resolved_at is null;

alter table public.push_tickets enable row level security;

-- Operational data. Only the service role touches it; no policy is granted
-- to any client role, so nothing in the app can read another Reader's
-- delivery history.
create policy "Admins may read push tickets"
  on public.push_tickets for select
  to authenticated
  using (public.is_admin());

grant select on public.push_tickets to authenticated;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

-- Every fifteen minutes. Rates change a few times a day, so a tighter
-- schedule would spend invocations to shave minutes off a notification that
-- is already not urgent to the minute.
select cron.schedule(
  'check-alerts',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/check-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Receipts become available a few minutes after sending and are purged
-- upstream after 24 hours, so this runs on the same cadence, offset.
select cron.schedule(
  'check-push-receipts',
  '7,22,37,52 * * * *',
  $$
  select net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/check-push-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI'
    ),
    body := '{}'::jsonb
  );
  $$
);
