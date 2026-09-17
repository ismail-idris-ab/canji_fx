-- Verify that scheduled functions were called by the scheduler.
--
-- Until now the only gate on these functions was the platform's JWT check,
-- and the JWT the cron presents is the publishable anon key — which ships in
-- the app bundle and is committed to this repository. So anyone could invoke
-- them. Idempotence bounds what a repeated call *writes*, but not what it
-- *does*: fetch-cbn-rates would hammer cbn.gov.ng from this project's IP
-- against an undocumented endpoint, which is the exact over-exposure ADR 0004
-- rejected hourly polling to avoid, and check-rate-health would push a
-- notification to the Admin's phone on every call.
--
-- The secret is generated here by the database, so its value never appears in
-- this file, in the repository, or in any transcript. Both sides read it from
-- Vault: the cron job when building the request, the Edge Function when
-- checking it.

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'canji_cron_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'canji_cron_secret',
      'Shared secret proving a scheduled function was called by pg_cron'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Reschedule every job to present the secret
-- ---------------------------------------------------------------------------

create or replace function public.schedule_canji_job(
  job_name text,
  schedule text,
  function_name text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  -- The anon key is still sent because the platform's own JWT check runs
  -- before the function does. It is not the authorisation; the secret is,
  -- and unlike this key the secret never leaves the database.
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI';
  cron_secret text;
begin
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  perform cron.unschedule(job_name)
    where exists (select 1 from cron.job where jobname = job_name);

  perform cron.schedule(
    job_name,
    schedule,
    format(
      $sql$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', %L,
          'x-canji-cron', %L
        ),
        body := '{}'::jsonb
      );
      $sql$,
      'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/' || function_name,
      'Bearer ' || anon_key,
      cron_secret
    )
  );
end;
$$;

revoke execute on function public.schedule_canji_job(text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Apply to every scheduled job
-- ---------------------------------------------------------------------------

select public.schedule_canji_job('fetch-cbn-rates',     '0 5,11,17 * * 1-5',   'fetch-cbn-rates');
select public.schedule_canji_job('check-alerts',        '*/15 * * * *',        'check-alerts');
select public.schedule_canji_job('check-push-receipts', '7,22,37,52 * * * *',  'check-push-receipts');
select public.schedule_canji_job('check-rate-health',   '5 9 * * 1-5',         'check-rate-health');
