-- Admin identity and the write path for Rates.
--
-- The central rule: the application can never grant itself admin. There is
-- deliberately no insert, update or delete policy on profiles, so is_admin
-- is settable only by the service role — in practice, by a human in the SQL
-- editor. A flag the app could set is not a flag.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  is_admin   boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. is_admin is service-role only; no write policy '
  'exists on this table by design.';

-- ---------------------------------------------------------------------------
-- Profile rows are created automatically
-- ---------------------------------------------------------------------------

-- security definer because the trigger runs as the signing-up user, who has
-- no rights on this table. search_path is pinned so the function cannot be
-- redirected by a caller-controlled path.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anonymous Readers created before this migration also get a row. They are
-- not admins; this simply keeps the table complete.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reading your own profile
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- A Reader may see their own row and nobody else's. The app needs this to
-- know whether to reveal the admin area.
create policy "A user may read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Admin check
-- ---------------------------------------------------------------------------

-- security definer so the policy below does not re-enter profiles' own RLS,
-- which would recurse. Stable so it is evaluated once per statement.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Writing Rates
-- ---------------------------------------------------------------------------

-- Insert only. Rates are append-only: a mistake is corrected by observing
-- again, and the erroneous row stays as a record of what Readers were shown.
-- See ADR 0001. No update or delete policy is added here, or anywhere.
create policy "Admins may record rates"
  on public.rates for insert
  to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

grant insert on public.rates to authenticated;

-- The recording Admin is always themselves. Without this, an Admin could
-- attribute an observation to another account and break the audit trail.
comment on column public.rates.created_by is
  'The Admin who recorded this observation. Enforced to equal auth.uid() by '
  'the insert policy.';
