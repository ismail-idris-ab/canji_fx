import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildCsv, buildRows, csvFilename, type CsvMeta } from '@/domain/csv';
import type { SeriesPoint } from '@/domain/history';

/**
 * Writes the visible series to a CSV and hands it to the share sheet.
 *
 * The file goes to the cache directory rather than documents: it exists to be
 * handed straight to another app, and a Reader who wants to keep it will save
 * it wherever they chose to send it. Leaving copies in the app's permanent
 * storage would accumulate files nobody can see or clear.
 *
 * Everything about the file's contents — the attribution header, the
 * suppression of a gap where either side is missing, full stored precision —
 * is decided in the pure csv module, where it is tested.
 */

export type ExportOutcome =
  | { ok: true }
  | { ok: false; reason: string };

export async function exportSeriesAsCsv(
  parallel: readonly SeriesPoint[],
  official: readonly SeriesPoint[],
  meta: CsvMeta,
  isoDay: string
): Promise<ExportOutcome> {
  const rows = buildRows(parallel, official);

  if (rows.length === 0) {
    return { ok: false, reason: 'There is nothing in this range to export.' };
  }

  if (!(await Sharing.isAvailableAsync())) {
    return {
      ok: false,
      reason: 'Sharing is not available on this device.',
    };
  }

  try {
    const file = new File(Paths.cache, csvFilename(meta.currencyCode, isoDay));

    // A previous export of the same currency on the same day may still be
    // sitting in the cache.
    try {
      file.create({ overwrite: true });
    } catch {
      // Already present and writable, which write() handles below.
    }

    file.write(buildCsv(rows, meta));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: `${meta.currencyCode} rates from Canji`,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : 'Could not write the file.',
    };
  }
}
