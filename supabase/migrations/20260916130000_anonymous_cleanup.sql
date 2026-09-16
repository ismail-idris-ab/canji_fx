-- Removing abandoned anonymous Readers.
--
-- Every install creates a real row in auth.users and nothing is cleaned up
-- automatically. The only enforced control is a per-IP rate limit on
-- anonymous sign-in. Captcha was considered and rejected for v1: friction at
-- first launch, at exactly the moment someone is deciding whether to keep the
-- app. See ADR 0002.

create function public.purge_abandoned_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  with doomed as (
    select u.id
    from auth.users u
    where u.is_anonymous
      and u.created_at < now() - interval '30 days'
      -- A Reader who set an alert has invested something and is kept
      -- regardless of age. Deleting them would silently stop notifications
      -- they are still expecting.
      and not exists (
        select 1 from public.rate_alerts a where a.user_id = u.id
      )
  )
  delete from auth.users
  where id in (select id from doomed);

  get diagnostics removed = row_count;

  -- Recorded so growth can be observed, and so a purge that suddenly removes
  -- far more than usual is visible rather than silent.
  insert into public.system_events (kind, detail)
  values ('anonymous_purge', jsonb_build_object('removed', removed));

  return removed;
end;
$$;

comment on function public.purge_abandoned_anonymous_users is
  'Deletes anonymous users older than 30 days holding no Rate Alerts. '
  'Profiles cascade with the user.';

-- Weekly, Sunday 02:00 UTC. Row growth here is slow, so a daily job would be
-- noise; the point is to keep the table from growing without bound, not to
-- reclaim space promptly.
select cron.schedule(
  'purge-anonymous-users',
  '0 2 * * 0',
  $$ select public.purge_abandoned_anonymous_users(); $$
);
