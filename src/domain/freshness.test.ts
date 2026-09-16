import { describe, expect, it } from 'vitest';

import { classifyFreshness } from './freshness';
import type { Rate } from './types';

function parallelRate(observedAt: string): Rate {
  return {
    currencyCode: 'USD',
    market: 'parallel',
    buy: 1385,
    central: null,
    sell: 1395,
    sourceLabel: 'Parallel market survey',
    rateDate: null,
    observedAt: new Date(observedAt),
  };
}

function officialRate(rateDate: string | null): Rate {
  return {
    currencyCode: 'USD',
    market: 'official',
    buy: 1328.1485,
    central: 1328.6485,
    sell: 1329.1485,
    sourceLabel: 'Central Bank of Nigeria',
    rateDate,
    observedAt: new Date('2026-09-11T08:00:00Z'),
  };
}

describe('Parallel Market freshness', () => {
  const now = new Date('2026-09-15T12:00:00Z');

  it('is fresh just under six hours old', () => {
    expect(classifyFreshness(parallelRate('2026-09-15T06:01:00Z'), now)).toBe(
      'fresh'
    );
  });

  it('is aging at exactly six hours', () => {
    expect(classifyFreshness(parallelRate('2026-09-15T06:00:00Z'), now)).toBe(
      'aging'
    );
  });

  it('is still aging just under twenty-four hours', () => {
    expect(classifyFreshness(parallelRate('2026-09-14T12:01:00Z'), now)).toBe(
      'aging'
    );
  });

  it('is stale at exactly twenty-four hours', () => {
    expect(classifyFreshness(parallelRate('2026-09-14T12:00:00Z'), now)).toBe(
      'stale'
    );
  });

  it('is stale several days later', () => {
    expect(classifyFreshness(parallelRate('2026-09-11T12:00:00Z'), now)).toBe(
      'stale'
    );
  });
});

describe('Official Market freshness', () => {
  // The rule that matters: the CBN does not publish at weekends, so a Friday
  // figure is the current one all weekend. An elapsed-hours rule would call
  // it Stale by Sunday, every weekend, while it was perfectly correct.
  const friday = '2026-09-11';

  it('is fresh on the Friday it was published', () => {
    expect(
      classifyFreshness(officialRate(friday), new Date('2026-09-11T15:00:00Z'))
    ).toBe('fresh');
  });

  it('is still fresh on Saturday', () => {
    expect(
      classifyFreshness(officialRate(friday), new Date('2026-09-12T10:00:00Z'))
    ).toBe('fresh');
  });

  it('is still fresh on Sunday', () => {
    expect(
      classifyFreshness(officialRate(friday), new Date('2026-09-13T10:00:00Z'))
    ).toBe('fresh');
  });

  it('is aging on Monday, one publication day behind', () => {
    expect(
      classifyFreshness(officialRate(friday), new Date('2026-09-14T10:00:00Z'))
    ).toBe('aging');
  });

  it('is stale on Tuesday, two publication days behind', () => {
    expect(
      classifyFreshness(officialRate(friday), new Date('2026-09-15T10:00:00Z'))
    ).toBe('stale');
  });

  it('treats a missing rate date as stale rather than assuming it is current', () => {
    expect(
      classifyFreshness(officialRate(null), new Date('2026-09-11T15:00:00Z'))
    ).toBe('stale');
  });

  it('treats a rate date ahead of today as fresh, not as an error', () => {
    // If the source publishes ahead, that figure is the most current one
    // available. Staleness is about age, and this has none.
    expect(
      classifyFreshness(
        officialRate('2026-09-16'),
        new Date('2026-09-15T10:00:00Z')
      )
    ).toBe('fresh');
  });

  it('ignores how long ago Canji fetched it, using only the rate date', () => {
    const fetchedLongAgo: Rate = {
      ...officialRate('2026-09-15'),
      observedAt: new Date('2020-01-01T00:00:00Z'),
    };

    expect(
      classifyFreshness(fetchedLongAgo, new Date('2026-09-15T10:00:00Z'))
    ).toBe('fresh');
  });
});
