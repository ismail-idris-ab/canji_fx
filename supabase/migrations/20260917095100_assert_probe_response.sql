-- Assert the probe from the previous migration succeeded.
--
-- This pair has already earned its keep twice: securing the scheduled
-- functions broke every job once by reading the vault through PostgREST, and
-- again by calling an unqualified hmac. Neither would have been noticed until
-- rates quietly stopped updating, because the health check that reports such
-- an outage is itself one of the jobs that had stopped.
do $$
declare
  response record;
begin
  select status_code, content, error_msg into response
    from net._http_response
    where created > now() - interval '15 minutes'
    order by created desc
    limit 1;

  if response is null then
    raise exception 'No response recorded. pg_net did not dispatch the probe.';
  end if;

  if response.status_code is distinct from 200 then
    raise exception
      'Scheduler path is broken: returned % (%). Every scheduled job is failing.',
      response.status_code, coalesce(response.error_msg, response.content);
  end if;

  raise notice 'Scheduler path verified end to end: % %',
    response.status_code, response.content;
end $$;
