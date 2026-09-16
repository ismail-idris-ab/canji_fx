import { describe, expect, it } from 'vitest';

import { createRateBook } from './rate-book';
import type { Market, Rate } from './types';

function rate(
  currencyCode: string,
  market: Market,
  observedAt: string,
  sell: number
): Rate {
  return {
    currencyCode,
    market,
    buy: sell - 10,
    central: market === 'official' ? sell - 5 : null,
    sell,
    sourceLabel:
      market === 'parallel'
        ? 'Parallel market survey'
        : 'Central Bank of Nigeria',
    rateDate: market === 'official' ? observedAt.slice(0, 10) : null,
    observedAt: new Date(observedAt),
  };
}

const now = new Date('2026-09-15T12:00:00Z');

describe('the live Rate under append-only storage', () => {
  it('is the newest observation for the pair', () => {
    const book = createRateBook(
      [
        rate('USD', 'parallel', '2026-09-15T08:00:00Z', 1395),
        rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402),
        rate('USD', 'parallel', '2026-09-15T09:30:00Z', 1398),
      ],
      now
    );

    expect(book.latest('USD', 'parallel')?.sell).toBe(1402);
  });

  it('is unaffected by the order rates arrive in', () => {
    const newest = rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402);
    const older = rate('USD', 'parallel', '2026-09-15T08:00:00Z', 1395);

    expect(createRateBook([newest, older], now).latest('USD', 'parallel')?.sell)
      .toBe(1402);
    expect(createRateBook([older, newest], now).latest('USD', 'parallel')?.sell)
      .toBe(1402);
  });

  it('keeps a correction visible while the superseded observation remains in history', () => {
    // A fat-fingered rate is corrected by observing again, never by deleting.
    // The erroneous row stays as a record of what Readers were shown.
    const typo = rate('USD', 'parallel', '2026-09-15T10:00:00Z', 13950);
    const correction = rate('USD', 'parallel', '2026-09-15T10:04:00Z', 1395);

    const book = createRateBook([typo, correction], now);

    expect(book.latest('USD', 'parallel')?.sell).toBe(1395);
  });

  it('keeps the two Markets separate', () => {
    const book = createRateBook(
      [
        rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402),
        rate('USD', 'official', '2026-09-15T06:00:00Z', 1329.1485),
      ],
      now
    );

    expect(book.latest('USD', 'parallel')?.sell).toBe(1402);
    expect(book.latest('USD', 'official')?.sell).toBe(1329.1485);
  });

  it('keeps Quoted Currencies separate', () => {
    const book = createRateBook(
      [
        rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402),
        rate('GBP', 'parallel', '2026-09-15T11:00:00Z', 1880),
      ],
      now
    );

    expect(book.latest('USD', 'parallel')?.sell).toBe(1402);
    expect(book.latest('GBP', 'parallel')?.sell).toBe(1880);
  });

  it('is null for a pair that has never been observed', () => {
    const book = createRateBook(
      [rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402)],
      now
    );

    // CAD is traded on the street but not published by the CBN, so this pair
    // can never exist. The Rate Book says so rather than inventing one.
    expect(book.latest('CAD', 'official')).toBeNull();
    expect(book.freshness('CAD', 'official')).toBeNull();
  });

  it('is empty when handed no rates at all', () => {
    const book = createRateBook([], now);

    expect(book.latest('USD', 'parallel')).toBeNull();
    expect(book.currencies()).toEqual([]);
  });
});

describe('freshness through the Rate Book', () => {
  it('applies the parallel rule to a parallel rate', () => {
    const book = createRateBook(
      [rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402)],
      now
    );

    expect(book.freshness('USD', 'parallel')).toBe('fresh');
  });

  it('applies the publication-day rule to an official rate', () => {
    // Observed on Friday, read on Sunday: fresh, because its source does not
    // publish at weekends.
    const book = createRateBook(
      [rate('USD', 'official', '2026-09-11T06:00:00Z', 1329.1485)],
      new Date('2026-09-13T10:00:00Z')
    );

    expect(book.freshness('USD', 'official')).toBe('fresh');
  });
});

describe('currencies', () => {
  it('lists each Quoted Currency once, across both Markets', () => {
    const book = createRateBook(
      [
        rate('USD', 'parallel', '2026-09-15T11:00:00Z', 1402),
        rate('USD', 'official', '2026-09-15T06:00:00Z', 1329),
        rate('GBP', 'official', '2026-09-15T06:00:00Z', 1793),
      ],
      now
    );

    expect(book.currencies().sort()).toEqual(['GBP', 'USD']);
  });
});
