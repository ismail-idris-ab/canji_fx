-- Assert the scheduler can still reach its functions, at deploy time.
--
-- This exists because it already earned its keep: the first attempt at
-- securing these functions broke every scheduled job, and nothing else would
-- have noticed. fetch-cbn-rates is idempotent, so on a day the CBN has not
-- published, a working call and a rejected one both leave the database
-- unchanged — and the health check that would report the outage is itself one
-- of the jobs that had stopped running.
--
-- The post and the check must be separate transactions: pg_net queues a
-- request and dispatches it only after commit, so a check in the same
-- transaction always finds nothing.
do $$
declare
  cron_secret text;
  matched boolean;
begin
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  if cron_secret is null then
    raise exception 'canji_cron_secret is missing; every scheduled job would fail';
  end if;

  -- Checked directly rather than over HTTP, so this asserts the comparison
  -- itself rather than waiting on a round trip.
  select public.verify_cron_secret(cron_secret) into matched;

  if not matched then
    raise exception 'verify_cron_secret rejects the stored secret; the scheduler cannot authenticate';
  end if;

  if public.verify_cron_secret('not-the-secret') then
    raise exception 'verify_cron_secret accepts a wrong secret';
  end if;

  raise notice 'Scheduler secret verified in both directions.';
end $$;
