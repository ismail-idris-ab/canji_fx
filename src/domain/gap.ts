import type { Freshness, Rate } from './types';

/**
 * The Gap: the distance between the Parallel Market and the Official Market
 * for one Quoted Currency.
 *
 * Spread is within a market, Gap is between them — two words because one
 * word for two concepts breaks the moment both appear on screen.
 *
 * The convention is Parallel Sell against Official Central, and the UI states
 * that convention rather than leaving a Reader to infer it. Sell is the side
 * a Reader actually pays to obtain foreign currency, and Central is the only
 * honest official figure since no retail counterparty exists in the official
 * window.
 */
export type Gap = {
  /** Naira difference: parallel sell minus official central. */
  naira: number;
  /** As a fraction of the official central rate. */
  fraction: number;
  parallelSell: number;
  officialCentral: number;
};

/**
 * Returns null whenever the Gap would mislead rather than inform.
 *
 * A Gap is suppressed entirely — not greyed, not footnoted — when either
 * side is Stale. A Gap computed from a four-day-old parallel observation is
 * the single most misleading number this product could print, and it is
 * precisely the number that gets screenshotted and shared. Absent is better
 * than wrong.
 */
export function computeGap(
  parallel: Rate | null,
  official: Rate | null,
  parallelFreshness: Freshness | null,
  officialFreshness: Freshness | null
): Gap | null {
  if (!parallel || !official) return null;
  if (parallelFreshness === 'stale' || officialFreshness === 'stale') {
    return null;
  }

  const parallelSell = parallel.sell;
  const officialCentral = official.central;

  if (parallelSell === null || officialCentral === null) return null;
  if (officialCentral <= 0) return null;

  return {
    naira: parallelSell - officialCentral,
    fraction: (parallelSell - officialCentral) / officialCentral,
    parallelSell,
    officialCentral,
  };
}
