/**
 * Domain types. Pure data — no Supabase types leak in here, so the domain
 * modules stay testable without a database or a network.
 */

export type Market = 'parallel' | 'official';

export type RateSource =
  | 'Parallel market survey'
  | 'Central Bank of Nigeria'
  | 'Central Bank of Nigeria (manual entry)';

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
  /** Observed At: when Canji recorded this observation. */
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
