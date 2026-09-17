// GENERATED FILE — do not edit.
// Synced from src/domain/types.ts by `npm run sync:functions`.
// The source of truth lives there because that is where its tests run.

/**
 * Domain types. Pure data — no Supabase types leak in here, so the domain
 * modules stay testable without a database or a network.
 */

export type Market = 'parallel' | 'official';

/**
 * A currency Aboki Rate reports against the Naira, with its display configuration.
 *
 * `hasOfficial` is false for a currency traded on the Nigerian street that
 * the CBN does not publish — CAD today. That absence is permanent and must
 * be presented differently from a Rate that simply has not been observed yet.
 */
export type Currency = {
  code: string;
  name: string;
  flagEmoji: string;
  trackedParallel: boolean;
  hasOfficial: boolean;
};

export type RateSource =
  | 'Parallel market survey'
  | 'Central Bank of Nigeria'
  | 'Central Bank of Nigeria (manual entry)'
  /**
   * Bulk-imported history. Distinct from a live fetch so a Reader — or an
   * analyst reading an export — can tell the two apart. These rows keep an
   * honest Observed At: Aboki Rate recorded them at import time, and back-dating
   * it would claim an observation that never happened.
   */
  | 'Central Bank of Nigeria (historical import)';

/**
 * An observation of what one unit of a Quoted Currency was worth in Naira,
 * in one Market, at one moment, according to one Source.
 *
 * Buy and Sell are from the market operator's perspective: the operator buys
 * foreign currency from the public at `buy` and sells it to them at `sell`.
 */
export type Rate = {
  currencyCode: string;
  market: Market;
  buy: number | null;
  central: number | null;
  sell: number | null;
  sourceLabel: RateSource;
  /** The trading day the Source says this belongs to, as YYYY-MM-DD. */
  rateDate: string | null;
  /** Observed At: when Aboki Rate recorded this observation. */
  observedAt: Date;
};

/**
 * How much confidence a Reader should place in a Rate given its age.
 *
 * Expressed as a judgement rather than a duration because the two Markets
 * age differently: the Parallel Market is continuous, while the Official
 * Market publishes on weekdays only.
 */
export type Freshness = 'fresh' | 'aging' | 'stale';
