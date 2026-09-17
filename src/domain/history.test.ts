import { describe, expect, it } from 'vitest';

import {
  availableRanges,
  buildGapSeries,
  buildSeries,
  changeOver,
  earliestDay,
  valueAsOf,
  type DailyRate,
} from './history';

const TODAY = '2026-09-17';

function official(day: string, central: number): DailyRate {
  return {
    currencyCode: 'USD',
    market: 'official',
    day,
    buy: central - 0.5,
    central,
    sell: central + 0.5,
  };
}

function parallel(day: string, sell: number): DailyRate {
  return {
    currencyCode: 'USD',
    market: 'parallel',
    day,
    buy: sell - 10,
    central: null,
    sell,
  };
}

describe('building a series', () => {
  it('plots sell for the parallel market and central for the official one', () => {
    // The same sides the Gap compares, so the charts on one screen cannot
    // disagree with each other.
    const rates = [official('2026-09-16', 1329), parallel('2026-09-16', 1366)];

    expect(buildSeries(rates, 'official', 'all', TODAY)[0].value).toBe(1329);
    expect(buildSeries(rates, 'parallel', 'all', TODAY)[0].value).toBe(1366);
  });

  it('orders by day ascending regardless of input order', () => {
    const rates = [
      official('2026-09-17', 1330),
      official('2026-09-15', 1328),
      official('2026-09-16', 1329),
    ];

    expect(buildSeries(rates, 'official', 'all', TODAY).map((p) => p.day)).toEqual([
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
    ]);
  });

  it('omits days with no observation rather than filling them', () => {
    // The chart breaks its line across the gap. Interpolating would draw a
    // rate nobody observed; carrying forward would read as "the rate held"
    // when the truth is "nobody looked".
    const rates = [official('2026-09-14', 1327), official('2026-09-17', 1330)];
    const series = buildSeries(rates, 'official', 'all', TODAY);

    expect(series.map((p) => p.day)).toEqual(['2026-09-14', '2026-09-17']);
  });

  it('excludes points outside the range', () => {
    const rates = [official('2026-01-01', 1200), official('2026-09-16', 1329)];

    expect(buildSeries(rates, 'official', '7d', TODAY)).toHaveLength(1);
    expect(buildSeries(rates, 'official', 'all', TODAY)).toHaveLength(2);
  });

  it('drops a row whose plotted figure is missing', () => {
    const noCentral: DailyRate = { ...official('2026-09-16', 0), central: null };
    expect(buildSeries([noCentral], 'official', 'all', TODAY)).toEqual([]);
  });
});

describe('which ranges may be offered', () => {
  it('offers only what the anchoring series spans', () => {
    // Two days of parallel history must not offer a five-year comparison.
    const twoDays = [parallel('2026-09-16', 1366), parallel('2026-09-17', 1370)];

    expect(availableRanges(twoDays, TODAY)).toEqual(['all']);
  });

  it('widens as the series grows', () => {
    const aMonth = [parallel('2026-08-01', 1300), parallel('2026-09-17', 1370)];
    const ranges = availableRanges(aMonth, TODAY);

    expect(ranges).toContain('7d');
    expect(ranges).toContain('30d');
    expect(ranges).not.toContain('1y');
  });

  it('offers deep ranges for a long official series', () => {
    const deep = [official('2001-12-10', 112.35), official('2026-09-17', 1330)];
    expect(availableRanges(deep, TODAY)).toContain('5y');
  });

  it('answers per currency, not globally', () => {
    // The CBN began publishing AED in January 2026 and USD in 2001, so the
    // same range is honest for one and misleading for the other.
    const aed = [official('2026-01-22', 361), official('2026-09-17', 362)];
    expect(availableRanges(aed, TODAY)).not.toContain('1y');
  });

  it('offers nothing when there is no data', () => {
    expect(availableRanges([], TODAY)).toEqual([]);
  });
});

describe('the Gap series', () => {
  it('is parallel sell minus official central, per day', () => {
    const rates = [official('2026-09-16', 1329), parallel('2026-09-16', 1366)];
    const gap = buildGapSeries(rates, 'all', TODAY);

    expect(gap).toHaveLength(1);
    expect(gap[0].value).toBe(37);
  });

  it('produces no point on a day missing either side', () => {
    // Inherits the live Gap's suppression rule: a Gap computed from one
    // market and a guess about the other is the most misleading figure this
    // product could draw.
    const rates = [
      official('2026-09-15', 1328),
      official('2026-09-16', 1329),
      parallel('2026-09-16', 1366),
    ];

    expect(buildGapSeries(rates, 'all', TODAY).map((p) => p.day)).toEqual([
      '2026-09-16',
    ]);
  });

  it('is negative when the street is below the official rate', () => {
    const rates = [official('2026-09-16', 1329), parallel('2026-09-16', 1300)];
    expect(buildGapSeries(rates, 'all', TODAY)[0].value).toBeLessThan(0);
  });
});

describe('change over a range', () => {
  it('is first plotted point to last', () => {
    const series = buildSeries(
      [official('2026-09-15', 1000), official('2026-09-17', 1100)],
      'official',
      'all',
      TODAY
    );

    const change = changeOver(series);

    expect(change?.absolute).toBe(100);
    expect(change?.fraction).toBeCloseTo(0.1, 6);
    // Both endpoints are reported, because a bare percentage over an unstated
    // window means nothing.
    expect(change?.from.day).toBe('2026-09-15');
    expect(change?.to.day).toBe('2026-09-17');
  });

  it('is null with fewer than two points', () => {
    expect(changeOver([{ day: '2026-09-17', value: 1330 }])).toBeNull();
    expect(changeOver([])).toBeNull();
  });
});

describe('the value as of a date', () => {
  const series = [
    { day: '2026-09-14', value: 1327 },
    { day: '2026-09-17', value: 1330 },
  ];

  it('returns that day when it exists', () => {
    expect(valueAsOf(series, '2026-09-14')?.value).toBe(1327);
  });

  it('falls back to the most recent earlier day', () => {
    expect(valueAsOf(series, '2026-09-16')).toMatchObject({
      day: '2026-09-14',
      value: 1327,
    });
  });

  it('never returns a later observation', () => {
    // Answering a question about Monday with Wednesday's figure would be
    // answering with information that did not yet exist.
    expect(valueAsOf(series, '2026-09-10')).toBeNull();
  });
});

describe('earliest day', () => {
  it('finds the oldest', () => {
    expect(
      earliestDay([official('2026-09-17', 1330), official('2001-12-10', 112)])
    ).toBe('2001-12-10');
  });

  it('is null when empty', () => {
    expect(earliestDay([])).toBeNull();
  });
});
