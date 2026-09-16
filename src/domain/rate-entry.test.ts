import { describe, expect, it } from 'vitest';

import { checkEntry } from './rate-entry';
import type { Rate } from './types';

const previous: Rate = {
  currencyCode: 'USD',
  market: 'parallel',
  buy: 1385,
  central: null,
  sell: 1395,
  sourceLabel: 'Parallel market survey',
  rateDate: null,
  observedAt: new Date('2026-09-15T10:00:00Z'),
};

describe('rejecting entries outright', () => {
  it('refuses an incomplete pair', () => {
    expect(checkEntry('1385', '', previous)).toMatchObject({
      ok: false,
      problem: { kind: 'incomplete' },
    });
  });

  it('refuses text', () => {
    expect(checkEntry('one', '1395', previous)).toMatchObject({
      ok: false,
      problem: { kind: 'notANumber' },
    });
  });

  it('refuses zero or negative figures', () => {
    expect(checkEntry('0', '1395', previous)).toMatchObject({
      ok: false,
      problem: { kind: 'nonPositive' },
    });
  });

  it('refuses an inverted spread, which is always a typo', () => {
    expect(checkEntry('1395', '1385', previous)).toMatchObject({
      ok: false,
      problem: { kind: 'invertedSpread', buy: 1395, sell: 1385 },
    });
  });

  it('accepts buy equal to sell, which is unusual but not impossible', () => {
    expect(checkEntry('1390', '1390', previous).ok).toBe(true);
  });

  it('accepts figures typed with thousands separators', () => {
    const result = checkEntry('1,385', '1,395', previous);
    expect(result).toMatchObject({ ok: true, buy: 1385, sell: 1395 });
  });
});

describe('the deviation gate', () => {
  it('passes an ordinary movement without interruption', () => {
    const result = checkEntry('1390', '1400', previous);
    expect(result.ok && result.deviation).toBeNull();
  });

  it('catches a slipped digit', () => {
    // 13850 instead of 1385: the case the gate exists for. Under append-only
    // storage this would be permanent history and live to every Reader.
    const result = checkEntry('13850', '13950', previous);
    expect(result.ok && result.deviation).toMatchObject({
      side: 'buy',
      previous: 1385,
      typed: 13850,
    });
  });

  it('reports the larger of the two deviations', () => {
    const result = checkEntry('1390', '2500', previous);
    expect(result.ok && result.deviation?.side).toBe('sell');
  });

  it('does not fire just below the threshold', () => {
    // 1385 -> 1592 is a shade under 15%.
    const result = checkEntry('1592', '1600', previous);
    expect(result.ok && result.deviation).toBeNull();
  });

  it('fires just above the threshold', () => {
    // 1385 -> 1600 is over 15%.
    const result = checkEntry('1600', '1610', previous);
    expect(result.ok && result.deviation).not.toBeNull();
  });

  it('does not fire on the very first observation', () => {
    // With nothing to compare against, every value is plausible.
    const result = checkEntry('1385', '1395', null);
    expect(result.ok && result.deviation).toBeNull();
  });

  it('catches a large downward movement too', () => {
    const result = checkEntry('138', '140', previous);
    expect(result.ok && result.deviation).not.toBeNull();
  });
});
