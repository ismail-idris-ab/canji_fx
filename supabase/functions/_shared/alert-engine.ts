// GENERATED FILE — do not edit.
// Synced from src/domain/alert-engine.ts by `npm run sync:functions`.
// The source of truth lives there because that is where its tests run.

import type { Market, Rate } from './types.ts';

/**
 * Alert Engine: decides which Rate Alerts should fire, and how each should be
 * updated afterwards.
 *
 * Pure. It returns descriptions of what should happen and never sends
 * anything, which is what lets every firing rule below be tested without a
 * push service.
 */

export type WatchedSide = 'buy' | 'central' | 'sell';
export type AlertDirection = 'above' | 'below';

export type Alert = {
  id: string;
  currencyCode: string;
  market: Market;
  watchedSide: WatchedSide;
  direction: AlertDirection;
  threshold: number;
  /** Where the Rate stood when this alert was last evaluated. */
  lastSeenRate: number | null;
  expoPushToken: string;
};

export type Fire = {
  alert: Alert;
  /** The figure that crossed the threshold. */
  rate: number;
};

export type Update = {
  alertId: string;
  lastSeenRate: number;
  /** A fired alert deactivates itself: a threshold fires once. */
  deactivate: boolean;
};

export type Evaluation = {
  fires: Fire[];
  updates: Update[];
};

/**
 * Rates younger than this are ignored.
 *
 * Rates are append-only with no retraction, so a mistyped figure is live
 * until the next observation supersedes it. This window gives a correction
 * time to land before a typo becomes a push notification that cannot be
 * recalled. Display is never delayed — only alert evaluation, which no
 * Reader can perceive. See ADR 0001.
 */
export const SETTLE_WINDOW_MS = 10 * 60 * 1000;

function sideValue(rate: Rate, side: WatchedSide): number | null {
  if (side === 'buy') return rate.buy;
  if (side === 'sell') return rate.sell;
  return rate.central;
}

/** The newest Rate per pair that has settled long enough to act on. */
function settledRates(rates: readonly Rate[], now: Date): Map<string, Rate> {
  const cutoff = now.getTime() - SETTLE_WINDOW_MS;
  const live = new Map<string, Rate>();

  for (const rate of rates) {
    if (rate.observedAt.getTime() > cutoff) continue;

    const key = `${rate.currencyCode}:${rate.market}`;
    const held = live.get(key);
    if (!held || rate.observedAt.getTime() > held.observedAt.getTime()) {
      live.set(key, rate);
    }
  }

  return live;
}

/**
 * Alerts are edge-triggered: one fires on the Crossing, not for as long as
 * the threshold is exceeded. A level-triggered alert would notify a Reader
 * every time the job ran, which is why the previous value is remembered.
 */
export function evaluateAlerts(
  alerts: readonly Alert[],
  rates: readonly Rate[],
  now: Date
): Evaluation {
  const live = settledRates(rates, now);
  const evaluation: Evaluation = { fires: [], updates: [] };

  for (const alert of alerts) {
    const rate = live.get(`${alert.currencyCode}:${alert.market}`);
    if (!rate) continue;

    const current = sideValue(rate, alert.watchedSide);
    if (current === null) continue;

    // First observation: there is no previous value, so nothing has been
    // crossed. Record where the Rate stands and wait. Firing here would
    // notify a Reader about a threshold that was already met when they set
    // it, which is not what they asked to be told.
    if (alert.lastSeenRate === null) {
      evaluation.updates.push({
        alertId: alert.id,
        lastSeenRate: current,
        deactivate: false,
      });
      continue;
    }

    const crossed =
      alert.direction === 'above'
        ? alert.lastSeenRate < alert.threshold && current >= alert.threshold
        : alert.lastSeenRate > alert.threshold && current <= alert.threshold;

    if (crossed) {
      evaluation.fires.push({ alert, rate: current });
    }

    evaluation.updates.push({
      alertId: alert.id,
      lastSeenRate: current,
      deactivate: crossed,
    });
  }

  return evaluation;
}
