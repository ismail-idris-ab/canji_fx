-- Deploy-time probe: make one request exactly as the scheduler does.
--
-- The response is asserted by the next migration. They cannot be combined:
-- pg_net queues a request and dispatches it only after commit.
--
-- check-push-receipts is the safest of the four to exercise — with no pending
-- tickets it reports {"checked":0} and changes nothing.
do $$
declare
  cron_secret text;
begin
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  perform net.http_post(
    url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/check-push-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI',
      'x-canji-cron', cron_secret
    ),
    body := '{}'::jsonb
  );
end $$;
