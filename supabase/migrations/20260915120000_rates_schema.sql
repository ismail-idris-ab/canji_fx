-- Canji core schema: Quoted Currencies and Rates.
--
-- Vocabulary is defined in CONTEXT.md. In particular: a Rate is an
-- observation of what one unit of a Quoted Currency was worth in Naira, in
-- one Market, at one moment, according to one Source. Naira is the implicit
-- base of every Rate and is deliberately not a row in currencies.

-- ---------------------------------------------------------------------------
-- Quoted Currencies
-- ---------------------------------------------------------------------------

create table public.currencies (
  code             text primary key check (code ~ '^[A-Z]{3}$'),
  name             text        not null,
  flag_emoji       text        not null,
  sort_order       integer     not null,
  is_active        boolean     not null default true,

  -- A Tracked Currency is one the Admin observes manually in the Parallel
  -- Market. Most Quoted Currencies are not tracked: entering eleven
  -- currencies several times a day is a chore that would not get done, and
  -- unrecorded Rates decay into Stale ones.
  tracked_parallel boolean     not null default false,

  -- False for currencies with no Official Market counterpart. CAD is traded
  -- on the Nigerian street but is not published by the CBN, so it can never
  -- have an official Rate and can never show a Gap.
  has_official     boolean     not null default true,

  created_at       timestamptz not null default now()
);

comment on table public.currencies is
  'Quoted Currencies. Naira is the implicit base and is not listed here.';

-- ---------------------------------------------------------------------------
-- Upstream label mapping
-- ---------------------------------------------------------------------------

-- The CBN feed labels currencies inconsistently, with trailing whitespace,
-- tab characters and competing spellings across its history. Labels are
-- normalised then looked up here. An unmapped label is logged and skipped,
-- never guessed at — a mislabelled currency reaching a Reader is worse than
-- a missing one.
create table public.currency_source_labels (
  upstream_label text primary key,
  currency_code  text not null references public.currencies (code),
  created_at     timestamptz not null default now()
);

comment on column public.currency_source_labels.upstream_label is
  'Already normalised: trimmed and upper-cased.';

-- ---------------------------------------------------------------------------
-- Rates
-- ---------------------------------------------------------------------------

create type public.market as enum ('parallel', 'official');

comment on type public.market is
  'Markets are named as markets, not after institutions. The publisher of '
  'the official rate has changed twice since 2023 (I&E window, then NAFEM, '
  'then NFEM under EFEMS); the publisher is recorded in source_label.';

create type public.rate_source as enum (
  'Parallel market survey',
  'Central Bank of Nigeria',
  'Central Bank of Nigeria (manual entry)'
);

comment on type public.rate_source is
  'A closed set. This label is the legal framing shown to Readers, so it '
  'must not be free text that can drift toward dealer language.';

create table public.rates (
  id            uuid primary key default gen_random_uuid(),
  currency_code text not null references public.currencies (code),
  market        public.market not null,

  -- Buy and Sell are from the market operator's perspective, matching the
  -- convention every Nigerian rate source uses: the operator buys foreign
  -- currency from the public at buy, and sells it to them at sell.
  buy           numeric(18, 6),
  central       numeric(18, 6),
  sell          numeric(18, 6),

  source_label  public.rate_source not null,

  -- The trading day this Rate belongs to according to its Source, which is
  -- not when Canji observed it. An official Rate fetched on Monday may carry
  -- Friday's rate_date. Null for the Parallel Market, which has no publisher
  -- and therefore no published day.
  rate_date     date,

  created_by    uuid references auth.users (id),

  -- Observed At: when Canji recorded this observation.
  created_at    timestamptz not null default now(),

  -- The Parallel Market always carries a two-sided quote, and an inverted
  -- spread is always a typo.
  constraint parallel_is_two_sided check (
    market <> 'parallel'
    or (buy is not null and sell is not null and sell >= buy)
  ),

  -- The Official Market publishes all three figures.
  constraint official_is_three_sided check (
    market <> 'official'
    or (buy is not null and central is not null and sell is not null)
  ),

  -- An official Rate without the day it belongs to cannot have its Freshness
  -- computed, since official Freshness is measured in publication days.
  constraint official_has_rate_date check (
    market <> 'official' or rate_date is not null
  )
);

comment on table public.rates is
  'APPEND-ONLY. Rates are never updated or deleted: a mistake is corrected '
  'by recording a new observation, and the erroneous row remains as a record '
  'of what Readers were shown. The live Rate for a pair is the newest row.';

-- The only query shape that matters: newest row per Quoted Currency and
-- Market.
create index rates_currency_market_recent_idx
  on public.rates (currency_code, market, created_at desc);

-- ---------------------------------------------------------------------------
-- latest_rates
-- ---------------------------------------------------------------------------

-- security_invoker makes the base table's policies apply to the caller.
-- Without it a view runs as its owner (Postgres creates views security
-- definer by default) and would hand out every row regardless of policy.
create view public.latest_rates
with (security_invoker = true) as
select distinct on (r.currency_code, r.market)
  r.id,
  r.currency_code,
  r.market,
  r.buy,
  r.central,
  r.sell,
  r.source_label,
  r.rate_date,
  r.created_at
from public.rates r
order by r.currency_code, r.market, r.created_at desc;

comment on view public.latest_rates is
  'The live Rate per Quoted Currency and Market. Cannot be subscribed to via '
  'Realtime — Postgres publications cannot contain views — so clients watch '
  'inserts on rates and refetch this.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.currencies             enable row level security;
alter table public.currency_source_labels enable row level security;
alter table public.rates                  enable row level security;

-- Reads are open to both roles on purpose. Every install signs in
-- anonymously, arriving as `authenticated`, but anonymous sign-in is rate
-- limited per IP and can fail on shared or NAT'd connections — common in
-- Nigeria. A rate limit that locked someone out of seeing a rate would be an
-- own goal, so unauthenticated reads work too.

create policy "Anyone may read currencies"
  on public.currencies for select
  to anon, authenticated
  using (is_active);

create policy "Anyone may read currency label mappings"
  on public.currency_source_labels for select
  to anon, authenticated
  using (true);

create policy "Anyone may read rates"
  on public.rates for select
  to anon, authenticated
  using (true);

-- No insert, update or delete policies exist anywhere in this migration.
-- Writes arrive later and only for an Admin; until then the service role is
-- the only writer, which is what seeds and scheduled jobs use.

grant select on public.currencies             to anon, authenticated;
grant select on public.currency_source_labels to anon, authenticated;
grant select on public.rates                  to anon, authenticated;
grant select on public.latest_rates           to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- Clients subscribe to inserts here and refetch latest_rates, because a view
-- can never be part of a publication.
alter publication supabase_realtime add table public.rates;
