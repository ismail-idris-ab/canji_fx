-- One Rate per Quoted Currency, Market and day, for charts.
--
-- A day's parallel point is the *last* observation of that day, not a mean.
-- A mean would be a number nobody ever saw — the same objection that stopped
-- the Frankfurter fallback recording an invented spread. The last observation
-- is what a Reader checking at close would have seen, which matches how the
-- app is actually used.
--
-- Days with no observation are simply absent. The chart breaks its line
-- there rather than interpolating or carrying the previous value forward: a
-- flat segment reads as "the rate held" when the truth is "nobody looked".

-- Charts group by day; the existing index is ordered by created_at and suits
-- "newest row per pair" instead. At today's volume either works — this is so
-- the question does not return at ten times the size.
create index rates_currency_market_day_idx
  on public.rates (currency_code, market, rate_date desc);

create view public.daily_rates
with (security_invoker = true) as
select distinct on (bucketed.currency_code, bucketed.market, bucketed.day)
  bucketed.currency_code,
  bucketed.market,
  bucketed.day,
  bucketed.buy,
  bucketed.central,
  bucketed.sell,
  bucketed.source_label,
  bucketed.rate_date,
  bucketed.created_at
from (
  select
    r.*,
    -- The Official Market is bucketed by the trading day its Source
    -- published, never by when Canji fetched it: a Monday fetch of Friday's
    -- figure belongs to Friday. The Parallel Market has no publisher and so
    -- no published day, and is bucketed by the Lagos day the Admin was
    -- standing in the market. Bucketing by UTC would file a late-evening
    -- Lagos observation under the previous day.
    coalesce(
      r.rate_date,
      (r.created_at at time zone 'Africa/Lagos')::date
    ) as day
  from public.rates r
) as bucketed
order by
  bucketed.currency_code,
  bucketed.market,
  bucketed.day,
  bucketed.created_at desc;

comment on view public.daily_rates is
  'One Rate per currency, market and day — the last observation of that day. '
  'Absent days are absent, never interpolated.';

-- Same posture as latest_rates: the view runs as its caller, so the base
-- table policies apply and nothing new needs securing.
grant select on public.daily_rates to anon, authenticated;
