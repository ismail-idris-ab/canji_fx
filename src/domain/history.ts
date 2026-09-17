import type { Market } from './types';

/**
 * Turning stored daily Rates into the series a chart draws.
 *
 * Pure, like every domain module: no network, no clock reads, no chart
 * library types. The rules it encodes are the same ones the rest of the app
 * already follows — absent days stay absent, and nothing is invented to make
 * a line look continuous.
 */

/** One stored day, as `daily_rates` returns it. */
export type DailyRate = {
  currencyCode: string;
  market: Market;
  /** The day this belongs to, as YYYY-MM-DD. */
  day: string;
  buy: number | null;
  central: number | null;
  sell: number | null;
};

/** A plotted point. `value` is null where no observation exists. */
export type SeriesPoint = {
  day: string;
  value: number | null;
};

export type Range = '7d' | '30d' | '90d' | '1y' | '5y' | 'all';

export const RANGES: Range[] = ['7d', '30d', '90d', '1y', '5y', 'all'];

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  '5y': 1826,
};

export const RANGE_LABEL: Record<Range, string> = {
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '1y': '1Y',
  '5y': '5Y',
  all: 'All',
};

/**
 * The figure a chart plots for a Market.
 *
 * Parallel uses Sell — what a Reader pays to obtain foreign currency — and
 * Official uses Central, the only honest figure in a window with no retail
 * counterparty. These are the same sides the Gap already compares, so the
 * three charts on the screen cannot disagree with each other.
 */
export function plottedValue(rate: DailyRate): number | null {
  return rate.market === 'parallel' ? rate.sell : rate.central;
}

/** The earliest day present, or null when there is nothing. */
export function earliestDay(rates: readonly DailyRate[]): string | null {
  return rates.reduce<string | null>(
    (earliest, rate) => (!earliest || rate.day < earliest ? rate.day : earliest),
    null
  );
}

function startOfRange(range: Range, today: string): string | null {
  if (range === 'all') return null;

  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - RANGE_DAYS[range]);
  return start.toISOString().slice(0, 10);
}

/**
 * Which ranges may be offered.
 *
 * A range is offered only when the series that anchors the comparison spans
 * it. For a chart comparing both Markets that anchor is the parallel series,
 * which begins the day Canji started observing and cannot be reconstructed
 * — offering "5Y" would draw one complete line and one stub, inviting the
 * reader to conclude the parallel market did not exist before then.
 *
 * For an official-only chart the anchor is the official series, which for
 * some currencies reaches back to 2001 and for others only to last year: the
 * CBN began publishing AED in 2026, ZAR in 2017, CNY in 2011. So this is
 * answered per currency, never globally.
 */
export function availableRanges(
  anchor: readonly DailyRate[],
  today: string
): Range[] {
  const earliest = earliestDay(anchor);
  if (!earliest) return [];

  return RANGES.filter((range) => {
    if (range === 'all') return true;
    const start = startOfRange(range, today);
    return start !== null && earliest <= start;
  });
}

/**
 * The points for one Market over a range.
 *
 * Days without an observation are omitted rather than filled. A chart breaks
 * its line across the gap: interpolating would draw a rate nobody observed,
 * and carrying the previous value forward would read as "the rate held" when
 * the truth is "nobody looked".
 */
export function buildSeries(
  rates: readonly DailyRate[],
  market: Market,
  range: Range,
  today: string
): SeriesPoint[] {
  const start = startOfRange(range, today);

  return rates
    .filter((rate) => rate.market === market)
    .filter((rate) => start === null || rate.day >= start)
    .map((rate) => ({ day: rate.day, value: plottedValue(rate) }))
    .filter((point) => point.value !== null)
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * The Gap over time: parallel sell minus official central, per day.
 *
 * Inherits the suppression rule the live Gap already applies. A day missing
 * either side produces no point, because a Gap computed from one market and
 * a guess about the other is the most misleading figure this product could
 * draw.
 */
export function buildGapSeries(
  rates: readonly DailyRate[],
  range: Range,
  today: string
): SeriesPoint[] {
  const parallel = new Map(
    buildSeries(rates, 'parallel', range, today).map((p) => [p.day, p.value])
  );

  const gap: SeriesPoint[] = [];

  for (const official of buildSeries(rates, 'official', range, today)) {
    const street = parallel.get(official.day);
    if (street == null || official.value == null) continue;
    gap.push({ day: official.day, value: street - official.value });
  }

  return gap;
}

export type Change = {
  from: SeriesPoint;
  to: SeriesPoint;
  absolute: number;
  fraction: number;
};

/**
 * Change across what is actually plotted, first point to last.
 *
 * Reported with both endpoint dates rather than as a bare percentage, since
 * "+4.2%" over an unstated window means nothing — and the window a Reader
 * asked for is often not the window the data covers.
 */
export function changeOver(series: readonly SeriesPoint[]): Change | null {
  if (series.length < 2) return null;

  const from = series[0];
  const to = series[series.length - 1];

  if (from.value == null || to.value == null || from.value === 0) return null;

  const absolute = to.value - from.value;

  return { from, to, absolute, fraction: absolute / from.value };
}

/**
 * The value on a given day, or the most recent one before it.
 *
 * Answers "what would I have seen had I checked that day" without inventing
 * anything — provided the caller shows the date the figure actually came
 * from, never the date that was asked for. Deliberately never returns a later
 * observation: that would answer with information which did not yet exist.
 */
export function valueAsOf(
  series: readonly SeriesPoint[],
  day: string
): SeriesPoint | null {
  let found: SeriesPoint | null = null;

  for (const point of series) {
    if (point.day <= day && (!found || point.day > found.day)) {
      found = point;
    }
  }

  return found;
}

/** The value range a chart should draw, across every series it shows. */
export type Domain = { min: number; max: number };

/**
 * One shared scale for several series.
 *
 * Charting libraries normally derive a scale per series. For a comparison
 * that is actively misleading: a parallel line around ₦1,366 and an official
 * one around ₦1,330 would each be stretched to fill the same height, so the
 * gap between them would look like whatever the renderer chose, and the lines
 * could even appear to cross. Both must be measured against the same axis or
 * the picture is a lie.
 *
 * A little padding is added so a line never runs along the very edge, and a
 * flat series still draws a line rather than collapsing to zero height.
 */
export function sharedDomain(
  serieses: readonly (readonly SeriesPoint[])[]
): Domain | null {
  const values = serieses
    .flat()
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    // A single distinct value: give it room so it renders as a flat line
    // rather than a degenerate scale.
    const padding = Math.abs(min) * 0.01 || 1;
    return { min: min - padding, max: max + padding };
  }

  const padding = (max - min) * 0.08;
  return { min: min - padding, max: max + padding };
}
