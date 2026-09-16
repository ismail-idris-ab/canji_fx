import { describe, expect, it } from 'vitest';

import { isWeekend, mostRecentWeekday, toLagosDate, weekdaysBetween } from './time';

describe('toLagosDate', () => {
  it('reports the Lagos calendar day, which is an hour ahead of UTC', () => {
    expect(toLagosDate(new Date('2026-09-15T10:00:00Z'))).toBe('2026-09-15');
  });

  it('rolls to the next day late in the UTC evening', () => {
    // 23:30 UTC is 00:30 the following morning in Lagos. A Reader in Nigeria
    // looking at their phone at half past midnight is on the next day, and a
    // Rate must not appear to belong to the day that has just ended.
    expect(toLagosDate(new Date('2026-09-15T23:30:00Z'))).toBe('2026-09-16');
  });

  it('does not roll back early in the UTC morning', () => {
    expect(toLagosDate(new Date('2026-09-15T00:30:00Z'))).toBe('2026-09-15');
  });
});

describe('isWeekend', () => {
  it('identifies Saturday and Sunday', () => {
    expect(isWeekend('2026-09-12')).toBe(true); // Saturday
    expect(isWeekend('2026-09-13')).toBe(true); // Sunday
  });

  it('does not treat weekdays as weekend', () => {
    expect(isWeekend('2026-09-11')).toBe(false); // Friday
    expect(isWeekend('2026-09-14')).toBe(false); // Monday
  });
});

describe('mostRecentWeekday', () => {
  it('returns a weekday unchanged', () => {
    expect(mostRecentWeekday('2026-09-11')).toBe('2026-09-11'); // Friday
  });

  it('returns Friday for a Saturday', () => {
    expect(mostRecentWeekday('2026-09-12')).toBe('2026-09-11');
  });

  it('returns Friday for a Sunday', () => {
    expect(mostRecentWeekday('2026-09-13')).toBe('2026-09-11');
  });
});

describe('weekdaysBetween', () => {
  it('is zero for the same day', () => {
    expect(weekdaysBetween('2026-09-14', '2026-09-14')).toBe(0);
  });

  it('counts consecutive weekdays', () => {
    expect(weekdaysBetween('2026-09-14', '2026-09-15')).toBe(1);
  });

  it('does not count the weekend between Friday and Monday', () => {
    expect(weekdaysBetween('2026-09-11', '2026-09-14')).toBe(1);
  });

  it('counts across a month boundary', () => {
    // Mon 31 Aug 2026 to Tue 1 Sep 2026.
    expect(weekdaysBetween('2026-08-31', '2026-09-01')).toBe(1);
    // Fri 28 Aug 2026 to Tue 1 Sep 2026: Monday and Tuesday only.
    expect(weekdaysBetween('2026-08-28', '2026-09-01')).toBe(2);
  });

  it('is negative when the first date is later', () => {
    expect(weekdaysBetween('2026-09-15', '2026-09-14')).toBe(-1);
  });
});
