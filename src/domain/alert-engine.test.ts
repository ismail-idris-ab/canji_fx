import { describe, expect, it } from 'vitest';

import { evaluateAlerts, SETTLE_WINDOW_MS, type Alert } from './alert-engine';
import type { Rate } from './types';

const now = new Date('2026-09-16T12:00:00Z');
const settled = new Date(now.getTime() - SETTLE_WINDOW_MS - 1000);

function rate(sell: number, observedAt: Date = settled): Rate {
  return {
    currencyCode: 'USD',
    market: 'parallel',
    buy: sell - 10,
    central: null,
    sell,
    sourceLabel: 'Parallel market survey',
    rateDate: null,
    observedAt,
  };
}

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'a1',
    currencyCode: 'USD',
    market: 'parallel',
    watchedSide: 'sell',
    direction: 'above',
    threshold: 1400,
    lastSeenRate: 1390,
    expoPushToken: 'ExponentPushToken[x]',
    ...overrides,
  };
}

describe('firing on a Crossing', () => {
  it('fires when the Rate rises through an above threshold', () => {
    const result = evaluateAlerts([alert()], [rate(1405)], now);

    expect(result.fires).toHaveLength(1);
    expect(result.fires[0].rate).toBe(1405);
  });

  it('fires when the Rate falls through a below threshold', () => {
    const below = alert({ direction: 'below', lastSeenRate: 1410 });
    const result = evaluateAlerts([below], [rate(1395)], now);

    expect(result.fires).toHaveLength(1);
  });

  it('fires when the Rate lands exactly on the threshold', () => {
    const result = evaluateAlerts([alert()], [rate(1400)], now);
    expect(result.fires).toHaveLength(1);
  });

  it('deactivates the alert that fired', () => {
    const result = evaluateAlerts([alert()], [rate(1405)], now);
    expect(result.updates[0].deactivate).toBe(true);
  });
});

describe('staying quiet', () => {
  it('does not fire while the Rate merely remains above the threshold', () => {
    // Level-triggered behaviour would notify the Reader every time the job
    // ran. A threshold that fires forever is not a threshold.
    const alreadyAbove = alert({ lastSeenRate: 1405 });
    const result = evaluateAlerts([alreadyAbove], [rate(1410)], now);

    expect(result.fires).toHaveLength(0);
    expect(result.updates[0].lastSeenRate).toBe(1410);
  });

  it('does not fire when the Rate moves the wrong way', () => {
    const result = evaluateAlerts([alert()], [rate(1380)], now);
    expect(result.fires).toHaveLength(0);
  });

  it('does not fire on the first observation', () => {
    // Nothing has been crossed yet. Firing here would tell a Reader about a
    // threshold that was already met when they set it.
    const fresh = alert({ lastSeenRate: null });
    const result = evaluateAlerts([fresh], [rate(1500)], now);

    expect(result.fires).toHaveLength(0);
    expect(result.updates[0]).toMatchObject({
      lastSeenRate: 1500,
      deactivate: false,
    });
  });

  it('does not fire on a Rate that has not settled', () => {
    // A mistyped rate is live until superseded, and a push notification
    // cannot be recalled. See ADR 0001.
    const justTyped = rate(99_999, new Date(now.getTime() - 60 * 1000));
    const result = evaluateAlerts([alert()], [justTyped], now);

    expect(result.fires).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
  });

  it('uses the newest settled Rate, ignoring an unsettled correction', () => {
    const older = rate(1405, new Date(now.getTime() - 30 * 60 * 1000));
    const typoJustNow = rate(99_999, new Date(now.getTime() - 60 * 1000));

    const result = evaluateAlerts([alert()], [older, typoJustNow], now);

    expect(result.fires[0].rate).toBe(1405);
  });

  it('ignores an alert whose pair has no Rate at all', () => {
    const noRate = alert({ currencyCode: 'CAD' });
    const result = evaluateAlerts([noRate], [rate(1405)], now);

    expect(result.fires).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
  });

  it('ignores an alert whose watched side is absent', () => {
    // A parallel Rate has no central figure.
    const watchesCentral = alert({ watchedSide: 'central' });
    const result = evaluateAlerts([watchesCentral], [rate(1405)], now);

    expect(result.fires).toHaveLength(0);
  });
});

describe('watched sides and markets', () => {
  it('compares the side the alert names', () => {
    const watchesBuy = alert({ watchedSide: 'buy', threshold: 1395 });
    // sell 1405 means buy 1395, which meets the threshold.
    const result = evaluateAlerts([watchesBuy], [rate(1405)], now);

    expect(result.fires[0].rate).toBe(1395);
  });

  it('keeps the two Markets apart', () => {
    const official: Rate = {
      ...rate(1330),
      market: 'official',
      central: 1329,
      rateDate: '2026-09-16',
    };

    const officialAlert = alert({
      market: 'official',
      watchedSide: 'central',
      threshold: 1328,
      // Below the threshold, so 1329 is a genuine upward crossing.
      lastSeenRate: 1320,
    });

    const result = evaluateAlerts([officialAlert], [rate(1405), official], now);

    expect(result.fires).toHaveLength(1);
    expect(result.fires[0].rate).toBe(1329);
  });
});

describe('many alerts at once', () => {
  it('evaluates each independently', () => {
    const alerts = [
      alert({ id: 'rising', threshold: 1400, lastSeenRate: 1390 }),
      alert({ id: 'far', threshold: 2000, lastSeenRate: 1390 }),
      alert({ id: 'falling', direction: 'below', threshold: 1300, lastSeenRate: 1390 }),
    ];

    const result = evaluateAlerts(alerts, [rate(1405)], now);

    expect(result.fires.map((f) => f.alert.id)).toEqual(['rising']);
    expect(result.updates).toHaveLength(3);
  });
});
