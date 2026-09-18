-- A per-publisher switch for in-app article rendering.
--
-- Articles are rendered inside the app in Aboki Rate's own typography, with
-- the publisher credited and a one-tap route to their site. If a publisher
-- objects, the remedy must be immediate and must not need a deploy — the
-- same shape as rss_url being nullable. See ADR 0008.
alter table public.news_sources
  add column full_text boolean not null default true;

comment on column public.news_sources.full_text is
  'False stops in-app article rendering for this publisher; their stories '
  'then open on their own site instead.';
