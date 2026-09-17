-- Let an Edge Function check the scheduler secret without reading the vault.
--
-- The first attempt had the function query vault.decrypted_secrets through
-- the client. That goes via PostgREST, which only exposes configured schemas,
-- and `vault` is deliberately not one of them — so the read failed, the check
-- returned false, and the functions refused their own scheduler. Every
-- scheduled job was dead until the deploy-time assertion caught it.
--
-- Comparing inside the database is better than fixing the read anyway: the
-- secret never crosses the API boundary at all, only a boolean does.

create function public.verify_cron_secret(presented text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, vault
as $$
declare
  expected text;
begin
  if presented is null or presented = '' then
    return false;
  end if;

  select decrypted_secret into expected
    from vault.decrypted_secrets where name = 'canji_cron_secret';

  if expected is null then
    return false;
  end if;

  -- Constant-time comparison, so the secret cannot be recovered a character
  -- at a time by timing the responses.
  return hmac(presented, 'canji', 'sha256') = hmac(expected, 'canji', 'sha256');
end;
$$;

-- Only the service role may ask. Edge Functions hold that key in their own
-- environment; nothing reachable with the publishable key can call this.
revoke execute on function public.verify_cron_secret(text)
  from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
