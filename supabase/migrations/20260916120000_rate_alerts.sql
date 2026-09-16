-- Rate Alerts: a Reader's standing request to be told when a Rate crosses a
-- threshold they chose.
--
-- Alerts are owned by auth.uid(), which is the whole reason every install
-- signs in anonymously rather than sending a device identifier. A
-- client-supplied string could be guessed, letting anyone enumerate, read or
-- delete another Reader's alerts — including their push tokens. See ADR 0002.

create type public.watched_side as enum ('buy', 'central', 'sell');
create type public.alert_direction as enum ('above', 'below');

create table public.rate_alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,

  -- Kept on the alert rather than on the user, because a Reader may reinstall
  -- and receive a new token while their alerts persist.
  expo_push_token text not null,

  currency_code   text not null references public.currencies (code),
  market          public.market not null,

  -- Which figure of the Rate is compared. Defaults differ by Market: Sell is
  -- what a Reader pays on the street, while the official window has no retail
  -- counterparty and only its Central Rate is meaningful.
  watched_side    public.watched_side not null,

  direction       public.alert_direction not null,
  threshold       numeric(18, 6) not null check (threshold > 0),

  -- Alerts are edge-triggered: they fire on the Crossing, not for as long as
  -- the threshold is exceeded. Detecting a crossing requires remembering
  -- where the Rate was last time it was checked.
  last_seen_rate  numeric(18, 6),

  active          boolean not null default true,
  last_fired_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index rate_alerts_active_idx
  on public.rate_alerts (active, currency_code, market)
  where active;

create index rate_alerts_owner_idx on public.rate_alerts (user_id);

-- ---------------------------------------------------------------------------
-- Ten active alerts per Reader
-- ---------------------------------------------------------------------------

-- Enforced here rather than only in the app, so the cap holds regardless of
-- which client is writing. It is also the natural place a paid tier later
-- raises or lowers.
create function public.enforce_alert_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.active then
    select count(*) into active_count
    from public.rate_alerts
    where user_id = new.user_id and active and id <> new.id;

    if active_count >= 10 then
      raise exception 'A reader may hold at most 10 active alerts.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger rate_alerts_limit
  before insert or update on public.rate_alerts
  for each row execute function public.enforce_alert_limit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.rate_alerts enable row level security;

-- Readers are anonymous by design, so there is deliberately no restriction
-- against anonymous identities here — only against reaching someone else's
-- rows. A push token is personal data and must never be readable by another
-- account.
create policy "A reader may read their own alerts"
  on public.rate_alerts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "A reader may create their own alerts"
  on public.rate_alerts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "A reader may change their own alerts"
  on public.rate_alerts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "A reader may delete their own alerts"
  on public.rate_alerts for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.rate_alerts to authenticated;
