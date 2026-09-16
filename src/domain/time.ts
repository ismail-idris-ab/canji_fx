/**
 * Lagos calendar arithmetic.
 *
 * Nigeria observes West Africa Time year round and has no daylight saving,
 * so WAT is permanently UTC+1. That lets these functions use a fixed offset
 * instead of Intl time zone support, which is inconsistently available in
 * Hermes. Fewer moving parts, and identical results.
 */

const WAT_OFFSET_MINUTES = 60;

/** A calendar day in Lagos, as YYYY-MM-DD. */
export type LagosDate = string;

export function toLagosDate(instant: Date): LagosDate {
  const shifted = new Date(instant.getTime() + WAT_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Day of week for a Lagos date. 0 is Sunday, 6 is Saturday. */
function dayOfWeek(date: LagosDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function addDays(date: LagosDate, days: number): LagosDate {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function isWeekend(date: LagosDate): boolean {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
}

/**
 * The most recent weekday on or before the given date.
 *
 * On a Saturday this is Friday; on a Sunday, also Friday. This is what makes
 * a Friday Official Market Rate read as current all weekend, rather than
 * decaying while its Source is simply closed.
 */
export function mostRecentWeekday(date: LagosDate): LagosDate {
  let candidate = date;
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, -1);
  }
  return candidate;
}

/**
 * How many weekdays `to` is ahead of `from`, counting neither endpoint's
 * weekend days. Returns 0 when they are the same weekday, and a negative
 * number if `from` is later than `to`.
 */
export function weekdaysBetween(from: LagosDate, to: LagosDate): number {
  if (from === to) return 0;

  const forward = from < to;
  const [start, end] = forward ? [from, to] : [to, from];

  let count = 0;
  let cursor = start;
  while (cursor < end) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) count += 1;
  }

  return forward ? count : -count;
}
