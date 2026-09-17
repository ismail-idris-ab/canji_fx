import { describe, expect, it } from 'vitest';

import { buildCsv, buildRows, csvFilename } from './csv';

const META = {
  currencyCode: 'USD',
  rangeLabel: '30D',
  retrievedAt: '17 Sep 2026, 9:12 PM WAT',
};

describe('joining the series into rows', () => {
  it('pairs the two markets on the same day', () => {
    const rows = buildRows(
      [{ day: '2026-09-16', value: 1366 }],
      [{ day: '2026-09-16', value: 1329 }]
    );

    expect(rows).toEqual([
      { day: '2026-09-16', parallel: 1366, official: 1329, gap: 37 },
    ]);
  });

  it('leaves the other market blank where it has nothing', () => {
    const rows = buildRows([], [{ day: '2026-09-15', value: 1328 }]);

    expect(rows[0]).toMatchObject({ parallel: null, official: 1328 });
  });

  it('leaves the gap blank when either side is missing', () => {
    // Same suppression the app applies everywhere else: a gap derived from
    // one market and a guess about the other is worse than no gap.
    const rows = buildRows([], [{ day: '2026-09-15', value: 1328 }]);
    expect(rows[0].gap).toBeNull();
  });

  it('sorts by day ascending', () => {
    const rows = buildRows(
      [],
      [
        { day: '2026-09-17', value: 1330 },
        { day: '2026-09-15', value: 1328 },
      ]
    );

    expect(rows.map((r) => r.day)).toEqual(['2026-09-15', '2026-09-17']);
  });

  it('includes no row for a day neither market observed', () => {
    // The file says exactly what the chart drew.
    const rows = buildRows(
      [{ day: '2026-09-16', value: 1366 }],
      [{ day: '2026-09-16', value: 1329 }]
    );

    expect(rows).toHaveLength(1);
  });
});

describe('the file itself', () => {
  const rows = buildRows(
    [{ day: '2026-09-16', value: 1366 }],
    [{ day: '2026-09-16', value: 1329.3568 }]
  );

  it('credits the Central Bank of Nigeria', () => {
    // Their terms permit reuse only on condition the Bank is credited, and a
    // CSV lands somewhere with no other context — so the attribution has to
    // travel inside the file.
    expect(buildCsv(rows, META)).toContain('Central Bank of Nigeria');
  });

  it('carries the indicative-rates disclaimer', () => {
    const csv = buildCsv(rows, META);
    expect(csv).toContain('indicative');
    expect(csv).toContain('not an offer');
  });

  it('records when it was retrieved', () => {
    expect(buildCsv(rows, META)).toContain('17 Sep 2026');
  });

  it('names the currency and the range', () => {
    const csv = buildCsv(rows, META);
    expect(csv).toContain('USD');
    expect(csv).toContain('30D');
  });

  it('has a header row naming every column', () => {
    expect(buildCsv(rows, META)).toContain(
      'date,parallel_sell,official_central,gap'
    );
  });

  it('keeps full stored precision', () => {
    // Rounding would be amending published CBN material, which their terms
    // forbid. The app rounds for display only.
    expect(buildCsv(rows, META)).toContain('1329.3568');
  });

  it('writes an empty field rather than a zero for a missing figure', () => {
    const sparse = buildRows([], [{ day: '2026-09-15', value: 1328 }]);
    const line = buildCsv(sparse, META).trim().split('\n').at(-1);

    expect(line).toBe('2026-09-15,,1328,');
  });

  it('ends with a newline so the last row is not dropped', () => {
    expect(buildCsv(rows, META).endsWith('\n')).toBe(true);
  });
});

describe('the filename', () => {
  it('says what it holds and sorts by date', () => {
    expect(csvFilename('USD', '2026-09-17')).toBe('aboki-rate-usd-2026-09-17.csv');
  });
});
