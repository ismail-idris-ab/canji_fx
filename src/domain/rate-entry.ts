import type { Rate } from './types';

/**
 * Validation for a Parallel Market observation being recorded.
 *
 * Rates are append-only with no retraction, so a mistake is permanent history
 * and is live until the next observation supersedes it. These two checks are
 * what make that safe rather than merely strict, and ADR 0001 says so
 * explicitly: removing either one changes the risk of the append-only design.
 */

/** Above this, a typed value needs a second confirmation before recording. */
export const DEVIATION_THRESHOLD = 0.15;

export type EntryProblem =
  | { kind: 'incomplete' }
  | { kind: 'notANumber' }
  | { kind: 'nonPositive' }
  | { kind: 'invertedSpread'; buy: number; sell: number };

export type EntryCheck =
  | { ok: false; problem: EntryProblem }
  | { ok: true; buy: number; sell: number; deviation: Deviation | null };

/** A typed value far enough from the last observation to warrant a pause. */
export type Deviation = {
  side: 'buy' | 'sell' | 'central';
  previous: number;
  typed: number;
  fraction: number;
};

export function checkEntry(
  buyInput: string,
  sellInput: string,
  previous: Rate | null
): EntryCheck {
  if (!buyInput.trim() || !sellInput.trim()) {
    return { ok: false, problem: { kind: 'incomplete' } };
  }

  const buy = Number(buyInput.replace(/,/g, ''));
  const sell = Number(sellInput.replace(/,/g, ''));

  if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
    return { ok: false, problem: { kind: 'notANumber' } };
  }

  if (buy <= 0 || sell <= 0) {
    return { ok: false, problem: { kind: 'nonPositive' } };
  }

  // An inverted spread is always a typo. The database rejects it too; this
  // catches it before a round trip so the Admin sees it immediately.
  if (sell < buy) {
    return { ok: false, problem: { kind: 'invertedSpread', buy, sell } };
  }

  return { ok: true, buy, sell, deviation: findDeviation(buy, sell, previous) };
}

/**
 * The largest deviation from the previous observation, if either side moved
 * more than the threshold. A slipped digit shows up as an enormous fraction
 * here, which is exactly the case worth interrupting.
 */
function findDeviation(
  buy: number,
  sell: number,
  previous: Rate | null
): Deviation | null {
  if (!previous) return null;

  const candidates: Deviation[] = [];

  if (previous.buy !== null && previous.buy > 0) {
    candidates.push({
      side: 'buy',
      previous: previous.buy,
      typed: buy,
      fraction: Math.abs(buy - previous.buy) / previous.buy,
    });
  }

  if (previous.sell !== null && previous.sell > 0) {
    candidates.push({
      side: 'sell',
      previous: previous.sell,
      typed: sell,
      fraction: Math.abs(sell - previous.sell) / previous.sell,
    });
  }

  const worst = candidates.sort((a, b) => b.fraction - a.fraction)[0];

  return worst && worst.fraction > DEVIATION_THRESHOLD ? worst : null;
}

/**
 * Validation for an Official Market Rate entered by hand.
 *
 * This is the break-glass path for when the automatic fetch is broken or the
 * upstream endpoint has changed shape. It is deliberately stricter than the
 * parallel entry: an official Rate carries three figures and the trading day
 * it belongs to, because Official Market Freshness is measured in publication
 * days and a Rate without a Rate Date cannot be placed on that calendar.
 */
export type OfficialEntryProblem =
  | { kind: 'incomplete' }
  | { kind: 'notANumber' }
  | { kind: 'nonPositive' }
  | { kind: 'outOfOrder'; buy: number; central: number; sell: number }
  | { kind: 'badRateDate' };

export type OfficialEntryCheck =
  | { ok: false; problem: OfficialEntryProblem }
  | {
      ok: true;
      buy: number;
      central: number;
      sell: number;
      rateDate: string;
      deviation: Deviation | null;
    };

export function checkOfficialEntry(
  buyInput: string,
  centralInput: string,
  sellInput: string,
  rateDateInput: string,
  previous: Rate | null
): OfficialEntryCheck {
  if (
    !buyInput.trim() ||
    !centralInput.trim() ||
    !sellInput.trim() ||
    !rateDateInput.trim()
  ) {
    return { ok: false, problem: { kind: 'incomplete' } };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rateDateInput.trim())) {
    return { ok: false, problem: { kind: 'badRateDate' } };
  }

  const rateDate = rateDateInput.trim();
  if (Number.isNaN(Date.parse(`${rateDate}T00:00:00Z`))) {
    return { ok: false, problem: { kind: 'badRateDate' } };
  }

  const buy = Number(buyInput.replace(/,/g, ''));
  const central = Number(centralInput.replace(/,/g, ''));
  const sell = Number(sellInput.replace(/,/g, ''));

  if (![buy, central, sell].every(Number.isFinite)) {
    return { ok: false, problem: { kind: 'notANumber' } };
  }

  if (buy <= 0 || central <= 0 || sell <= 0) {
    return { ok: false, problem: { kind: 'nonPositive' } };
  }

  // The CBN publishes buy below central below sell. Anything else means a
  // figure was transcribed into the wrong box, which is the likeliest mistake
  // when copying three numbers off a page.
  if (!(buy <= central && central <= sell)) {
    return { ok: false, problem: { kind: 'outOfOrder', buy, central, sell } };
  }

  const deviation = previous?.central
    ? deviationFrom(previous.central, central, 'central')
    : null;

  return { ok: true, buy, central, sell, rateDate, deviation };
}

function deviationFrom(
  previous: number,
  typed: number,
  side: Deviation['side']
): Deviation | null {
  const fraction = Math.abs(typed - previous) / previous;
  return fraction > DEVIATION_THRESHOLD
    ? { side, previous, typed, fraction }
    : null;
}
