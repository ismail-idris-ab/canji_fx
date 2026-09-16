import { describe, expect, it } from 'vitest';

import { convert } from './conversion';
import type { Rate } from './types';

const parallel: Rate = {
  currencyCode: 'USD',
  market: 'parallel',
  buy: 1385,
  central: null,
  sell: 1395,
  sourceLabel: 'Parallel market survey',
  rateDate: null,
  observedAt: new Date('2026-09-15T10:00:00Z'),
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

describe('parallel market conversion', () => {
  it('pays the Buy Rate when the Reader is selling foreign currency', () => {
    // The operator buys $100 from the Reader at 1385.
    const result = convert(parallel, 100, 'toNaira');
    expect(result?.result).toBe(138_500);
    expect(result?.appliedSide).toBe('buy');
  });

  it('charges the Sell Rate when the Reader is buying foreign currency', () => {
    // The operator sells dollars to the Reader at 1395.
    const result = convert(parallel, 139_500, 'fromNaira');
    expect(result?.result).toBe(100);
    expect(result?.appliedSide).toBe('sell');
  });

  it('is deliberately not symmetric', () => {
    // Round-tripping loses the Spread, because that is what actually happens.
    // A midpoint conversion would hide it, which is the whole reason a Reader
    // consults a rate at all.
    const out = convert(parallel, 100, 'toNaira');
    const back = convert(parallel, out!.result, 'fromNaira');

    expect(back!.result).toBeLessThan(100);
    expect(back!.result).toBeCloseTo(99.28, 2);
  });

  it('reports the exact figure it applied', () => {
    expect(convert(parallel, 1, 'toNaira')?.appliedRate).toBe(1385);
    expect(convert(parallel, 1, 'fromNaira')?.appliedRate).toBe(1395);
  });
});

describe('official market conversion', () => {
  it('uses the Central Rate when converting to Naira', () => {
    const result = convert(official, 100, 'toNaira');
    expect(result?.appliedSide).toBe('central');
    expect(result?.result).toBeCloseTo(132_864.85, 2);
  });

  it('uses the Central Rate converting from Naira too', () => {
    // There is no retail counterparty in the official window, so presenting
    // an achievable buy or sell side would be a fiction.
    const result = convert(official, 132_864.85, 'fromNaira');
    expect(result?.appliedSide).toBe('central');
    expect(result?.result).toBeCloseTo(100, 6);
  });

  it('is symmetric, because one figure applies both ways', () => {
    const out = convert(official, 100, 'toNaira');
    const back = convert(official, out!.result, 'fromNaira');
    expect(back!.result).toBeCloseTo(100, 6);
  });
});

describe('conversions that cannot be made', () => {
  it('returns null when the needed side is absent', () => {
    const noBuy: Rate = { ...parallel, buy: null };
    expect(convert(noBuy, 100, 'toNaira')).toBeNull();
    // The other direction still works, because it needs a different figure.
    expect(convert(noBuy, 100, 'fromNaira')).not.toBeNull();
  });

  it('returns null for a negative amount', () => {
    expect(convert(parallel, -1, 'toNaira')).toBeNull();
  });

  it('returns null for a non-finite amount', () => {
    expect(convert(parallel, Number.NaN, 'toNaira')).toBeNull();
    expect(convert(parallel, Number.POSITIVE_INFINITY, 'toNaira')).toBeNull();
  });

  it('returns zero for a zero amount rather than refusing', () => {
    expect(convert(parallel, 0, 'toNaira')?.result).toBe(0);
  });

  it('refuses to divide by a nonsensical rate', () => {
    const zeroed: Rate = { ...parallel, sell: 0 };
    expect(convert(zeroed, 100, 'fromNaira')).toBeNull();
  });
});
