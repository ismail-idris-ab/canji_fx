/**
 * Upstream Feed: turns a CBN payload into Rates, or into a description of
 * why it could not.
 *
 * Pure. No network, no database, no clock. The Edge Function that uses it
 * performs the I/O and delegates every decision here, which is what lets the
 * awkward parts — dirty labels, two date formats, dedupe — be tested without
 * touching the CBN at all.
 *
 * See ADR 0004 for why this source is depended on and how fragile it is.
 */

export type UpstreamRow = {
  currency?: unknown;
  ratedate?: unknown;
  buyingrate?: unknown;
  centralrate?: unknown;
  sellingrate?: unknown;
};

export type ParsedRate = {
  currencyCode: string;
  /** The trading day the CBN says this belongs to, as YYYY-MM-DD. */
  rateDate: string;
  buy: number;
  central: number;
  sell: number;
};

export type ParseResult = {
  rates: ParsedRate[];
  /** Labels with no mapping. Reported, never guessed at. */
  unmapped: string[];
  /** Rows dropped as structurally unusable, with the reason. */
  rejected: { label: string; reason: string }[];
};

/** Trimmed and upper-cased. The feed carries trailing spaces and tabs. */
export function normaliseLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

const MONTHS: Record<string, string> = {
  JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
  MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
  SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
};

/**
 * The feed uses two date formats across its endpoints: "2026-09-15" on the
 * exchange rates feed and "September-15-2026" on the NFEM one. Both are
 * accepted; anything else is refused rather than guessed at, because a
 * misread date silently corrupts Freshness.
 */
export function parseRateDate(raw: string): string | null {
  const value = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value;
  }

  const named = value.match(/^([A-Za-z]+)-(\d{1,2})-(\d{4})$/);
  if (named) {
    const month = MONTHS[named[1].toUpperCase()];
    if (!month) return null;
    const day = named[2].padStart(2, '0');
    return `${named[3]}-${month}-${day}`;
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @param labelMap normalised upstream label to currency code
 * @param wanted   only these dates are of interest, usually the newest one
 */
export function parseUpstream(
  rows: unknown,
  labelMap: Record<string, string>,
  wanted?: (rateDate: string) => boolean
): ParseResult {
  const result: ParseResult = { rates: [], unmapped: [], rejected: [] };

  if (!Array.isArray(rows)) {
    result.rejected.push({ label: '(payload)', reason: 'not an array' });
    return result;
  }

  const seenUnmapped = new Set<string>();

  for (const row of rows as UpstreamRow[]) {
    if (typeof row?.currency !== 'string') {
      result.rejected.push({ label: '(row)', reason: 'no currency label' });
      continue;
    }

    const label = normaliseLabel(row.currency);
    const code = labelMap[label];

    if (!code) {
      // Non-consumer units and genuinely new labels both land here. Either
      // way an unrecognised label is skipped and reported — a mislabelled
      // currency reaching a Reader is worse than a missing one.
      if (!seenUnmapped.has(label)) {
        seenUnmapped.add(label);
        result.unmapped.push(label);
      }
      continue;
    }

    const rateDate =
      typeof row.ratedate === 'string' ? parseRateDate(row.ratedate) : null;

    if (!rateDate) {
      result.rejected.push({ label, reason: 'unparseable rate date' });
      continue;
    }

    if (wanted && !wanted(rateDate)) continue;

    const buy = toNumber(row.buyingrate);
    const central = toNumber(row.centralrate);
    const sell = toNumber(row.sellingrate);

    if (buy === null || central === null || sell === null) {
      result.rejected.push({ label, reason: 'missing or non-numeric figure' });
      continue;
    }

    if (buy <= 0 || central <= 0 || sell <= 0) {
      result.rejected.push({ label, reason: 'non-positive figure' });
      continue;
    }

    result.rates.push({ currencyCode: code, rateDate, buy, central, sell });
  }

  return result;
}

/** The newest rate date present, or null when there are none. */
export function latestRateDate(rates: ParsedRate[]): string | null {
  return rates.reduce<string | null>(
    (newest, rate) => (!newest || rate.rateDate > newest ? rate.rateDate : newest),
    null
  );
}

/**
 * Which parsed Rates are genuinely new.
 *
 * Dedupe is on Quoted Currency and Rate Date, not on fetch time. The source
 * publishes once per weekday, so polling it three times a day would otherwise
 * append three identical rows — and under append-only storage those would be
 * permanent.
 */
export function selectNew(
  rates: ParsedRate[],
  alreadyStored: ReadonlySet<string>
): ParsedRate[] {
  const chosen = new Map<string, ParsedRate>();

  for (const rate of rates) {
    const key = storedKey(rate.currencyCode, rate.rateDate);
    if (alreadyStored.has(key)) continue;
    // A payload containing the same pair twice contributes one row.
    if (!chosen.has(key)) chosen.set(key, rate);
  }

  return [...chosen.values()];
}

export function storedKey(currencyCode: string, rateDate: string): string {
  return `${currencyCode}:${rateDate}`;
}
