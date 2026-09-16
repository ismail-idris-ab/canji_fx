import type { Market } from '@/domain/types';

/**
 * Presentation helpers.
 *
 * Times render in Africa/Lagos regardless of device timezone, because a Rate
 * is a Nigerian fact: a Reader in London seeing their own local time would
 * misjudge how old it is. Nigeria has no daylight saving, so a fixed UTC+1
 * offset is exact — the same reasoning as src/domain/time.ts.
 */

const WAT_OFFSET_MS = 60 * 60_000;

function watParts(instant: Date) {
  const shifted = new Date(instant.getTime() + WAT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** e.g. "3:10 PM" */
export function formatWatTime(instant: Date): string {
  const { hours, minutes } = watParts(instant);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** e.g. "15 Sep" */
export function formatWatDay(instant: Date): string {
  const { day, month } = watParts(instant);
  return `${day} ${MONTHS[month]}`;
}

/**
 * Observed At as a Reader reads it: the day only when it is not today, so
 * the common case stays short without ever hiding age.
 */
export function formatObservedAt(instant: Date, now: Date): string {
  const sameDay =
    watParts(instant).year === watParts(now).year &&
    watParts(instant).month === watParts(now).month &&
    watParts(instant).day === watParts(now).day;

  return sameDay
    ? `${formatWatTime(instant)} WAT`
    : `${formatWatDay(instant)}, ${formatWatTime(instant)} WAT`;
}

/** e.g. "15 Sep 2026" — the trading day an official Rate belongs to. */
export function formatRateDate(rateDate: string): string {
  const [year, month, day] = rateDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Parallel Market figures show as whole Naira, official to two decimals.
 *
 * Full precision is always stored and only ever rounded here, at render.
 * The CBN's licence forbids amending or distorting its published material,
 * and the About screen states that displayed values are rounded.
 */
export function formatNaira(value: number, market: Market): string {
  const decimals = market === 'parallel' ? 0 : 2;
  const fixed = value.toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₦${grouped}${fraction ? `.${fraction}` : ''}`;
}
