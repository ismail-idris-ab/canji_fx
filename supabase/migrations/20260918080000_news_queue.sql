-- News moves from hand-pasted URLs to polled feeds with an approval queue.
--
-- Items arrive automatically and wait. Only an item an Admin has approved
-- reaches a Reader, which keeps the property that matters: every story in
-- Aboki Rate is one a human chose to link. Fully automatic publishing would
-- put unreviewed headlines under this brand, and "our robot fetched it" is a
-- far weaker position than "we chose it" the day a publisher runs something
-- wrong.

create type public.news_status as enum ('pending', 'published', 'rejected');

alter table public.news_items
  add column status public.news_status not null default 'pending',

  -- A short excerpt, capped by us rather than by the publisher. Feeds carry
  -- these expressly for syndication and every reader application shows them,
  -- but the field is the publisher's to change — some put entire articles in
  -- it. The cap and the refusal of content:encoded are what keep this an
  -- index rather than a mirror. See ADR 0007.
  add column excerpt text check (excerpt is null or length(excerpt) <= 200),

  -- Null for anything pasted by hand; set for anything that arrived from a
  -- feed, so the origin of an item is never guesswork.
  add column feed_domain text references public.news_sources (domain);

-- Everything that existed before this was published by hand and was live.
update public.news_items
  set status = (
    case when is_active then 'published' else 'rejected' end
  )::public.news_status;

-- is_active is replaced rather than kept alongside. Two overlapping flags
-- would guarantee a later argument about which one wins.
drop policy if exists "Anyone may read active news" on public.news_items;
alter table public.news_items drop column is_active;

create policy "Anyone may read published news"
  on public.news_items for select
  to anon, authenticated
  using (status = 'published');

-- The Admin needs to see the queue, which Readers must not.
create policy "Admins may read every news item"
  on public.news_items for select
  to authenticated
  using (public.is_admin());

create index news_items_queue_idx
  on public.news_items (status, published_at desc);

drop index if exists news_items_active_idx;
create index news_items_published_idx
  on public.news_items (sort_order, published_at desc)
  where status = 'published';

-- ---------------------------------------------------------------------------
-- Feeds
-- ---------------------------------------------------------------------------

-- Null means this publisher is recognised but not polled. TheCable returns
-- 403 to a declared bot and ThisDay's feed path is dead — both stay linkable
-- by hand rather than being impersonated past their own refusal.
alter table public.news_sources add column rss_url text
  check (rss_url is null or rss_url ~ '^https://');

update public.news_sources set rss_url = 'https://nairametrics.com/feed/'      where domain = 'nairametrics.com';
update public.news_sources set rss_url = 'https://businessday.ng/feed/'        where domain = 'businessday.ng';
update public.news_sources set rss_url = 'https://punchng.com/feed/'           where domain = 'punchng.com';
update public.news_sources set rss_url = 'https://www.premiumtimesng.com/feed' where domain = 'premiumtimesng.com';
update public.news_sources set rss_url = 'https://www.vanguardngr.com/feed/'   where domain = 'vanguardngr.com';

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

-- Every six hours. FX news breaks during the trading day, and a queue
-- reviewed a few times daily gains nothing from hourly polling — while the
-- publishers being pulled from lose something.
select public.schedule_canji_job(
  'fetch-news',
  '0 */6 * * *',
  'fetch-news'
);
