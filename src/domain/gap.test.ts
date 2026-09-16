import { describe, expect, it } from 'vitest';

import { computeGap } from './gap';
import type { Rate } from './types';

const parallel: Rate = {
  currencyCode: 'USD',
  market: 'parallel',
  buy: 1356,
  central: null,
  sell: 1366,
  sourceLabel: 'Parallel market survey',
  rateDate: null,
  observedAt: new Date('2026-09-16T06:45:00Z'),
};

const official: Rate = {
  currencyCode: 'USD',
  market: 'official',
  buy: 1328.1485,
  central: 1328.6485,
  sell: 1329.1485,
  sourceLabel: 'Central Bank of Nigeria',
  rateDate: '2026-09-15',
  observedAt: new Date('2026-09-15T06:00:00Z'),
};

describe('computing the Gap', () => {
  it('compares parallel sell against official central', () => {
    const gap = computeGap(parallel, official, 'fresh', 'fresh');

    expect(gap?.parallelSell).toBe(1366);
    expect(gap?.officialCentral).toBe(1328.6485);
    expect(gap?.naira).toBeCloseTo(37.3515, 4);
    expect(gap?.fraction).toBeCloseTo(0.0281, 4);
  });

  it('is negative when the street is below the official rate', () => {
    const cheapStreet: Rate = { ...parallel, sell: 1300 };
    const gap = computeGap(cheapStreet, official, 'fresh', 'fresh');

    expect(gap?.naira).toBeLessThan(0);
    expect(gap?.fraction).toBeLessThan(0);
  });

  it('is computed while either side is merely aging', () => {
    expect(computeGap(parallel, official, 'aging', 'fresh')).not.toBeNull();
    expect(computeGap(parallel, official, 'fresh', 'aging')).not.toBeNull();
  });
});

describe('suppressing the Gap', () => {
  // Absent is better than wrong. This is the number people screenshot.
  it('is suppressed when the parallel side is stale', () => {
    expect(computeGap(parallel, official, 'stale', 'fresh')).toBeNull();
  });

  it('is suppressed when the official side is stale', () => {
    expect(computeGap(parallel, official, 'fresh', 'stale')).toBeNull();
  });

  it('is suppressed when there is no parallel observation', () => {
    expect(computeGap(null, official, null, 'fresh')).toBeNull();
  });

  it('is suppressed when the currency has no official counterpart', () => {
    // CAD is traded on the Nigerian street but not published by the CBN, so
    // it can never have a Gap.
    expect(computeGap(parallel, null, 'fresh', null)).toBeNull();
  });

  it('is suppressed when the parallel sell figure is missing', () => {
    const noSell: Rate = { ...parallel, sell: null };
    expect(computeGap(noSell, official, 'fresh', 'fresh')).toBeNull();
  });

  it('refuses to divide by a nonsensical official rate', () => {
    const zeroed: Rate = { ...official, central: 0 };
    expect(computeGap(parallel, zeroed, 'fresh', 'fresh')).toBeNull();
  });
});
