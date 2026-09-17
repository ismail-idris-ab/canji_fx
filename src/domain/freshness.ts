import { mostRecentWeekday, toLagosDate, weekdaysBetween } from './time';
import type { Freshness, Rate } from './types';

/**
 * Freshness is deliberately two different rules, because the two Markets age
 * differently.
 *
 * The Parallel Market is continuous: it trades every day, so a Rate simply
 * decays with elapsed time.
 *
 * The Official Market publishes on weekdays only. Measuring it in elapsed
 * hours would mark a perfectly current Friday Rate as Stale by Sunday, every
 * single weekend — which would destroy exactly the trust this product is
 * built on. So it is measured in publication days instead.
 */

const PARALLEL_FRESH_HOURS = 6;
const PARALLEL_AGING_HOURS = 24;

const MS_PER_HOUR = 3_600_000;

export function classifyFreshness(rate: Rate, now: Date): Freshness {
  return rate.market === 'parallel'
    ? classifyParallel(rate.observedAt, now)
    : classifyOfficial(rate.rateDate, now);
}

function classifyParallel(observedAt: Date, now: Date): Freshness {
  const hours = (now.getTime() - observedAt.getTime()) / MS_PER_HOUR;

  if (hours < PARALLEL_FRESH_HOURS) return 'fresh';
  if (hours < PARALLEL_AGING_HOURS) return 'aging';
  return 'stale';
}

/**
 * An Official Market Rate is Fresh when its Rate Date is the most recent
 * weekday, Aging when one weekday behind, and Stale at two or more.
 *
 * No holiday calendar is maintained. A Nigerian public holiday therefore
 * shows Aging for a day, which is honest rather than wrong: the figure
 * genuinely is a day old, and saying so costs less than silently claiming
 * currency Aboki Rate cannot verify.
 */
function classifyOfficial(rateDate: string | null, now: Date): Freshness {
  // An official Rate without a Rate Date cannot be placed on the publication
  // calendar at all, so it is treated as unreliable rather than assumed good.
  if (!rateDate) return 'stale';

  const reference = mostRecentWeekday(toLagosDate(now));
  const behind = weekdaysBetween(rateDate, reference);

  // A Rate Date in the future is not a staleness problem; it means the source
  // published ahead, and the figure is the most current one available.
  if (behind <= 0) return 'fresh';
  if (behind === 1) return 'aging';
  return 'stale';
}
