-- Qualify hmac, which lives in the extensions schema on Supabase.
--
-- verify_cron_secret pinned search_path to `public, vault`, so the unqualified
-- hmac call raised 42883 every time. The function therefore never returned
-- true, and every scheduled job stayed locked out — the same outage the
-- previous fix was meant to end.
--
-- Pinning search_path is still right: it stops the function being redirected
-- by a caller-controlled path. It just has to include everything the body
-- actually uses.

create or replace function public.verify_cron_secret(presented text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, vault, extensions
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

  -- Constant-time comparison: hashing both sides means the work does not
  -- depend on where the first differing character falls, so the secret cannot
  -- be recovered one character at a time by timing the responses.
  return extensions.hmac(presented, 'canji', 'sha256')
       = extensions.hmac(expected, 'canji', 'sha256');
end;
$$;

revoke execute on function public.verify_cron_secret(text)
  from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
