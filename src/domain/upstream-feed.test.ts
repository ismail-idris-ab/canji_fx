import { describe, expect, it } from 'vitest';

import {
  latestRateDate,
  normaliseLabel,
  parseRateDate,
  parseUpstream,
  selectNew,
  storedKey,
} from './upstream-feed';

// The mapping as seeded, keyed by normalised label.
const LABELS: Record<string, string> = {
  'US DOLLAR': 'USD',
  'POUNDS STERLING': 'GBP',
  'POUND STERLING': 'GBP',
  EURO: 'EUR',
  'SWISS FRANC': 'CHF',
  YEN: 'JPY',
  'YUAN/RENMINBI': 'CNY',
  'SOUTH AFRICAN RAND': 'ZAR',
  'UAE DIRHAM': 'AED',
  RIYAL: 'SAR',
  'DANISH KRONA': 'DKK',
};

describe('label normalisation', () => {
  // These are real forms observed in the CBN feed, not hypotheticals.
  it('strips trailing spaces', () => {
    expect(normaliseLabel('US DOLLAR ')).toBe('US DOLLAR');
  });

  it('strips tab characters', () => {
    expect(normaliseLabel('EURO\t')).toBe('EURO');
  });

  it('collapses internal whitespace', () => {
    expect(normaliseLabel('US  DOLLAR')).toBe('US DOLLAR');
  });

  it('upper-cases', () => {
    expect(normaliseLabel('us dollar')).toBe('US DOLLAR');
  });
});

describe('rate date parsing', () => {
  it('accepts the exchange rates feed format', () => {
    expect(parseRateDate('2026-09-15')).toBe('2026-09-15');
  });

  it('accepts the NFEM feed format', () => {
    expect(parseRateDate('September-15-2026')).toBe('2026-09-15');
  });

  it('pads a single-digit day', () => {
    expect(parseRateDate('March-3-2026')).toBe('2026-03-03');
  });

  it('refuses an unknown month name rather than guessing', () => {
    expect(parseRateDate('Smarch-3-2026')).toBeNull();
  });

  it('refuses an unrecognised format', () => {
    // A misread date silently corrupts Freshness, which is the one thing
    // this product cannot get wrong.
    expect(parseRateDate('15/09/2026')).toBeNull();
    expect(parseRateDate('')).toBeNull();
  });
});

describe('parsing a payload', () => {
  const payload = [
    { currency: 'US DOLLAR ', ratedate: '2026-09-15', buyingrate: '1328.1485', centralrate: '1328.6485', sellingrate: '1329.1485' },
    { currency: 'EURO\t', ratedate: '2026-09-15', buyingrate: '1533.6131', centralrate: '1534.1904', sellingrate: '1534.7678' },
    { currency: 'CFA', ratedate: '2026-09-15', buyingrate: '2.3094', centralrate: '2.3194', sellingrate: '2.3294' },
    { currency: 'WAUA', ratedate: '2026-09-15', buyingrate: '1800', centralrate: '1801', sellingrate: '1802' },
  ];

  it('maps dirty labels to currency codes', () => {
    const result = parseUpstream(payload, LABELS);
    expect(result.rates.map((r) => r.currencyCode).sort()).toEqual(['EUR', 'USD']);
  });

  it('reports unmapped labels instead of guessing at them', () => {
    const result = parseUpstream(payload, LABELS);
    expect(result.unmapped.sort()).toEqual(['CFA', 'WAUA']);
  });

  it('reports each unmapped label once', () => {
    const repeated = [...payload, { ...payload[2] }];
    expect(parseUpstream(repeated, LABELS).unmapped).toEqual(['CFA', 'WAUA']);
  });

  it('keeps full upstream precision', () => {
    const usd = parseUpstream(payload, LABELS).rates.find(
      (r) => r.currencyCode === 'USD'
    );
    // Rounding a published figure would be amending it, which the CBN's
    // terms forbid. Rounding happens at render only.
    expect(usd?.central).toBe(1328.6485);
  });

  it('filters to the dates asked for', () => {
    const mixed = [
      ...payload,
      { currency: 'US DOLLAR', ratedate: '2026-09-14', buyingrate: '1', centralrate: '2', sellingrate: '3' },
    ];
    const result = parseUpstream(mixed, LABELS, (d) => d === '2026-09-15');
    expect(result.rates.every((r) => r.rateDate === '2026-09-15')).toBe(true);
  });
});

describe('refusing structurally bad rows', () => {
  it('rejects a payload that is not an array', () => {
    const result = parseUpstream({ oops: true }, LABELS);
    expect(result.rates).toEqual([]);
    expect(result.rejected[0].reason).toBe('not an array');
  });

  it('rejects a row with a missing figure', () => {
    const result = parseUpstream(
      [{ currency: 'US DOLLAR', ratedate: '2026-09-15', buyingrate: '1', centralrate: null, sellingrate: '3' }],
      LABELS
    );
    expect(result.rates).toEqual([]);
    expect(result.rejected[0].reason).toBe('missing or non-numeric figure');
  });

  it('rejects a non-positive figure', () => {
    const result = parseUpstream(
      [{ currency: 'US DOLLAR', ratedate: '2026-09-15', buyingrate: '0', centralrate: '1', sellingrate: '2' }],
      LABELS
    );
    expect(result.rejected[0].reason).toBe('non-positive figure');
  });

  it('rejects an unparseable date', () => {
    const result = parseUpstream(
      [{ currency: 'US DOLLAR', ratedate: 'yesterday', buyingrate: '1', centralrate: '2', sellingrate: '3' }],
      LABELS
    );
    expect(result.rejected[0].reason).toBe('unparseable rate date');
  });
});

describe('dedupe', () => {
  const rate = { currencyCode: 'USD', rateDate: '2026-09-15', buy: 1, central: 2, sell: 3 };

  it('admits a pair that has not been stored', () => {
    expect(selectNew([rate], new Set())).toHaveLength(1);
  });

  it('skips a pair already stored', () => {
    // The source publishes once per weekday; polling three times a day must
    // not append three identical rows, which append-only would make permanent.
    const stored = new Set([storedKey('USD', '2026-09-15')]);
    expect(selectNew([rate], stored)).toHaveLength(0);
  });

  it('admits the same currency on a later rate date', () => {
    const stored = new Set([storedKey('USD', '2026-09-14')]);
    expect(selectNew([rate], stored)).toHaveLength(1);
  });

  it('collapses a duplicated pair within one payload', () => {
    expect(selectNew([rate, { ...rate }], new Set())).toHaveLength(1);
  });
});

describe('latest rate date', () => {
  it('finds the newest', () => {
    expect(
      latestRateDate([
        { currencyCode: 'USD', rateDate: '2026-09-14', buy: 1, central: 2, sell: 3 },
        { currencyCode: 'USD', rateDate: '2026-09-15', buy: 1, central: 2, sell: 3 },
      ])
    ).toBe('2026-09-15');
  });

  it('is null when there are none', () => {
    expect(latestRateDate([])).toBeNull();
  });
});
