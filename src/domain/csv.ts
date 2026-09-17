import type { SeriesPoint } from './history';

/**
 * Building the CSV a Reader takes away.
 *
 * Pure, so the exact bytes are testable without a filesystem.
 *
 * The header is not decoration. A CSV leaves the app and lands in a
 * spreadsheet or a WhatsApp group with no other context, so the attribution
 * has to travel with the file or it is not attribution at all — and the CBN's
 * terms permit reuse only on condition the Bank is credited. The same applies
 * to the indicative-rates disclaimer: a column of parallel figures with no
 * caveat reads like a price list.
 */

export type CsvRow = {
  day: string;
  parallel: number | null;
  official: number | null;
  gap: number | null;
};

/**
 * Joins the series by day.
 *
 * A day present in either series appears, with blanks where the other has
 * nothing. Days absent from the chart are absent here too: the file says
 * exactly what the chart drew, and neither invents a figure for a day nobody
 * observed.
 */
export function buildRows(
  parallel: readonly SeriesPoint[],
  official: readonly SeriesPoint[]
): CsvRow[] {
  const byDay = new Map<string, CsvRow>();

  const upsert = (day: string): CsvRow => {
    const existing = byDay.get(day);
    if (existing) return existing;
    const created: CsvRow = { day, parallel: null, official: null, gap: null };
    byDay.set(day, created);
    return created;
  };

  for (const point of parallel) {
    if (point.value !== null) upsert(point.day).parallel = point.value;
  }

  for (const point of official) {
    if (point.value !== null) upsert(point.day).official = point.value;
  }

  for (const row of byDay.values()) {
    // Same suppression as the Gap everywhere else: a day missing either side
    // gets no gap, rather than a figure derived from one market and a guess.
    row.gap =
      row.parallel !== null && row.official !== null
        ? row.parallel - row.official
        : null;
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Escapes a field only where a comma, quote or newline would break it. */
function field(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function number(value: number | null): string {
  // Full stored precision. Rounding here would be amending published CBN
  // material, which their terms forbid; the app rounds only for display.
  return value === null ? '' : String(value);
}

export type CsvMeta = {
  currencyCode: string;
  rangeLabel: string;
  /** When the file was produced, already formatted for a reader. */
  retrievedAt: string;
};

export function buildCsv(rows: readonly CsvRow[], meta: CsvMeta): string {
  const lines: string[] = [
    `# Aboki Rate — ${meta.currencyCode} against the Nigerian Naira (${meta.rangeLabel})`,
    '# Official market rates published by the Central Bank of Nigeria (cbn.gov.ng), reproduced unaltered.',
    '# Parallel market rates are indicative, sourced from market observation, and for information only.',
    '# They are not an offer, a quotation, or financial advice.',
    `# Retrieved ${meta.retrievedAt}`,
    '#',
    '# parallel_sell: what the street charges for one unit. official_central: the CBN midpoint.',
    '# gap: parallel_sell minus official_central. Blank where either side was not observed that day.',
    'date,parallel_sell,official_central,gap',
  ];

  for (const row of rows) {
    lines.push(
      [
        field(row.day),
        number(row.parallel),
        number(row.official),
        number(row.gap),
      ].join(',')
    );
  }

  // A trailing newline: some tools drop the last row without it.
  return `${lines.join('\n')}\n`;
}

/** A filename that sorts sensibly and says what it holds. */
export function csvFilename(currencyCode: string, isoDay: string): string {
  return `aboki-rate-${currencyCode.toLowerCase()}-${isoDay}.csv`;
}
