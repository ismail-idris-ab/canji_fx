-- One-shot verification that the scheduler can still reach its functions.
--
-- The previous migration closed these functions to anyone not presenting the
-- Vault secret. If the header the cron builds does not match what the
-- function checks, every scheduled job fails silently from that moment — no
-- official rates, no alerts, and a health check that cannot report its own
-- death because it is the thing that is dead.
--
-- So this performs exactly the request cron performs, once, at deploy time.
-- Its effect is observable: fetch-cbn-rates is idempotent, so a working call
-- either inserts today's rates or reports it is already up to date, and
-- either outcome proves the path.
do $$
declare
  cron_secret text;
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI';
begin
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  if cron_secret is null then
    raise exception 'canji_cron_secret is missing from the vault; scheduled jobs would all fail';
  end if;

  perform net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/fetch-cbn-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-canji-cron', cron_secret
    ),
    body := '{}'::jsonb
  );
end $$;
