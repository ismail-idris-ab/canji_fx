import type { Rate } from './types';

/**
 * Which way a Reader is converting.
 *
 * `toNaira` — they hold the Quoted Currency and want Naira.
 * `fromNaira` — they hold Naira and want the Quoted Currency.
 */
export type Direction = 'toNaira' | 'fromNaira';

/** Which figure of the Rate was applied, so the arithmetic can be checked. */
export type AppliedSide = 'buy' | 'sell' | 'central';

export type Conversion = {
  amount: number;
  result: number;
  appliedSide: AppliedSide;
  /** The figure used, at full stored precision. */
  appliedRate: number;
};

/**
 * Converts using the side of the Spread that would actually apply.
 *
 * Buy and Sell are from the market operator's perspective. A Reader holding
 * dollars is selling them to the operator, who pays the Buy Rate. A Reader
 * wanting dollars is buying from the operator, who charges the Sell Rate.
 * Using a midpoint both ways would understate the cost by the entire Spread
 * — which is precisely the quantity a Reader is trying to see.
 *
 * The Official Market uses the Central Rate in both directions, because no
 * retail counterparty exists in the official window: there is nobody there
 * to buy your dollars at the official buy rate, so presenting one as
 * achievable would be a fiction.
 */
export function convert(
  rate: Rate,
  amount: number,
  direction: Direction
): Conversion | null {
  if (!Number.isFinite(amount) || amount < 0) return null;

  const side = sideFor(rate, direction);
  if (!side) return null;

  const { appliedSide, appliedRate } = side;
  if (appliedRate <= 0) return null;

  const result =
    direction === 'toNaira' ? amount * appliedRate : amount / appliedRate;

  return { amount, result, appliedSide, appliedRate };
}

function sideFor(
  rate: Rate,
  direction: Direction
): { appliedSide: AppliedSide; appliedRate: number } | null {
  if (rate.market === 'official') {
    return rate.central === null
      ? null
      : { appliedSide: 'central', appliedRate: rate.central };
  }

  if (direction === 'toNaira') {
    return rate.buy === null
      ? null
      : { appliedSide: 'buy', appliedRate: rate.buy };
  }

  return rate.sell === null
    ? null
    : { appliedSide: 'sell', appliedRate: rate.sell };
}
