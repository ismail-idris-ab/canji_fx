-- Import the CBN's published history, one span at a time.
--
-- Chunked deliberately: the full-history payload is around 8 MB and the
-- endpoint ignores every pagination parameter, so a single twenty-five-year
-- import risks a function timeout. Each call is idempotent — it skips
-- anything already stored — so a chunk that fails can simply be repeated.
do $$
declare
  cron_secret text;
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGhmZm96cHB6bXRybWN3Y2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDkwMTgsImV4cCI6MjEwNTA4NTAxOH0.DAVJouFMZzf4pmQShThsZnyRGe5pREHxmsjaIjfA8cI';
  span record;
begin
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  for span in
    select
      (make_date(y, 1, 1))::text as from_date,
      (make_date(y + 4, 12, 31))::text as to_date
    from generate_series(2001, 2026, 5) as y
  loop
    perform net.http_post(
      url := 'https://mxhhffozppzmtrmcwcfy.supabase.co/functions/v1/backfill-cbn-history',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'x-canji-cron', cron_secret
      ),
      body := jsonb_build_object('from', span.from_date, 'to', span.to_date)
    );
  end loop;
end $$;
