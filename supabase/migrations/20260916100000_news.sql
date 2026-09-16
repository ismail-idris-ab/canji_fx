-- Curated FX news: headline, publisher, image and link. Never article text.
--
-- Canji stores a pointer to somebody else's work and sends readers to them.
-- Reproducing the body would make this a republisher rather than an index,
-- which is a copyright line, not a scope decision.

-- ---------------------------------------------------------------------------
-- Recognised publishers
-- ---------------------------------------------------------------------------

-- Publishers are first class so an outlet has one canonical name rather than
-- three spellings. The domain is the identity: it is what a URL actually
-- carries, and it cannot be mistyped into a duplicate the way a name can.
create table public.news_sources (
  domain     text primary key check (domain = lower(domain)),
  name       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

insert into public.news_sources (domain, name) values
  ('nairametrics.com',   'Nairametrics'),
  ('businessday.ng',     'BusinessDay'),
  ('punchng.com',        'The Punch'),
  ('premiumtimesng.com', 'Premium Times'),
  ('thecable.ng',        'TheCable'),
  ('vanguardngr.com',    'Vanguard'),
  ('thisdaylive.com',    'ThisDay'),
  ('reuters.com',        'Reuters'),
  ('bloomberg.com',      'Bloomberg');

-- ---------------------------------------------------------------------------
-- News items
-- ---------------------------------------------------------------------------

create table public.news_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0),

  -- The foreign key is the allowlist. An article from an unrecognised
  -- publisher cannot be inserted at all, so the rule is enforced by the
  -- database rather than by whichever screen happens to be writing.
  source_domain text not null references public.news_sources (domain),

  url           text not null unique check (url ~ '^https?://'),
  image_url     text,
  published_at  timestamptz,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now()
);

comment on table public.news_items is
  'Headline, publisher, image and link only. Article text is never stored.';

create index news_items_active_idx
  on public.news_items (is_active, sort_order, published_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.news_sources enable row level security;
alter table public.news_items   enable row level security;

create policy "Anyone may read active publishers"
  on public.news_sources for select
  to anon, authenticated
  using (is_active);

create policy "Anyone may read active news"
  on public.news_items for select
  to anon, authenticated
  using (is_active);

-- News is curated, so unlike Rates it is editable: a headline that turns out
-- to be wrong should come down. Rates are append-only because they are
-- observations of a moment; a News Item is a pointer that may simply be
-- retracted.
create policy "Admins may add publishers"
  on public.news_sources for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins may add news"
  on public.news_items for insert
  to authenticated
  with check (public.is_admin() and created_by = (select auth.uid()));

create policy "Admins may edit news"
  on public.news_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.news_sources to anon, authenticated;
grant select on public.news_items   to anon, authenticated;
grant insert on public.news_sources to authenticated;
grant insert, update on public.news_items to authenticated;
