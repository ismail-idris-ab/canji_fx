import { classifyFreshness } from './freshness';
import type { Freshness, Market, Rate } from './types';

/**
 * The Rate Book is the single object the user interface asks questions of.
 *
 * It is built from a collection of Rates and the current instant, and hides
 * every decision a caller could get wrong: which observation is live under
 * append-only storage, which Freshness rule applies to which Market, and
 * later which side of the Spread a conversion direction implies.
 *
 * Because the rates screen, the converter and the alert checker all ask the
 * same object, the same logic cannot drift between them. Nothing in here
 * reads the clock — `now` is always supplied — which is what lets the tests
 * assert relationships between instants rather than depending on when they
 * run.
 */
export type RateBook = {
  /** The live Rate for a pair, or null if none has ever been recorded. */
  latest: (currencyCode: string, market: Market) => Rate | null;
  /** Freshness of the live Rate for a pair, or null if there is none. */
  freshness: (currencyCode: string, market: Market) => Freshness | null;
  /** Every Quoted Currency with at least one Rate, in no particular order. */
  currencies: () => string[];
};

function key(currencyCode: string, market: Market): string {
  return `${currencyCode}:${market}`;
}

export function createRateBook(rates: readonly Rate[], now: Date): RateBook {
  // Rates are append-only, so the live Rate is simply the newest observation
  // per pair. The database view does this too; doing it again here keeps the
  // Rate Book correct when it is handed unfiltered rows, such as a cached
  // payload or a Realtime-patched list.
  const live = new Map<string, Rate>();

  for (const rate of rates) {
    const id = key(rate.currencyCode, rate.market);
    const held = live.get(id);
    if (!held || rate.observedAt.getTime() > held.observedAt.getTime()) {
      live.set(id, rate);
    }
  }

  return {
    latest(currencyCode, market) {
      return live.get(key(currencyCode, market)) ?? null;
    },

    freshness(currencyCode, market) {
      const rate = live.get(key(currencyCode, market));
      return rate ? classifyFreshness(rate, now) : null;
    },

    currencies() {
      return [...new Set([...live.values()].map((r) => r.currencyCode))];
    },
  };
}
