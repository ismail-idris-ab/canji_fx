import { createClient } from 'jsr:@supabase/supabase-js@2';

import { calledByScheduler, refuse } from '../_lib/cron-auth.ts';
import { parseUpstream, storedKey } from '../_shared/upstream-feed.ts';

/**
 * backfill-cbn-history — imports the CBN's published history.
 *
 * The full-history endpoint carries every rate the Bank has published since
 * December 2001. Parallel Market history cannot be recovered at all — nobody
 * observed it — so the official series is deep and the parallel one begins on
 * the day Canji started watching. The charts handle that asymmetry by
 * unlocking ranges only as the parallel data earns them.
 *
 * It reuses the same parser as the daily fetch on purpose. A separate import
 * script would be a second implementation of label mapping and date parsing,
 * which is exactly the code most likely to be subtly and silently wrong.
 *
 * Rows land with a distinct Source label so a bulk import is never mistaken
 * for a live observation, and with an honest Observed At — Canji recorded
 * them now, and claiming otherwise would corrupt the field this product
 * treats as sacred.
 *
 * Accepts an optional { from, to } window so a caller can import a few years
 * at a time rather than risking a timeout on twenty-five.
 */

const HISTORY = 'https://www.cbn.gov.ng/api/GetAllExchangeRates';
const INSERT_BATCH = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (!(await calledByScheduler(request, supabase))) return refuse();

  let from = '2001-01-01';
  let to = '2100-01-01';

  try {
    const body = (await request.json()) as { from?: string; to?: string };
    if (body.from) from = body.from;
    if (body.to) to = body.to;
  } catch {
    // No body is fine; the defaults import everything.
  }

  const { data: labelRows, error: labelError } = await supabase
    .from('currency_source_labels')
    .select('upstream_label, currency_code');

  if (labelError) return json({ error: labelError.message }, 500);

  const labelMap: Record<string, string> = {};
  for (const row of labelRows ?? []) {
    labelMap[row.upstream_label] = row.currency_code;
  }

  let payload: unknown;
  try {
    const response = await fetch(HISTORY, {
      headers: { Accept: 'application/json', 'User-Agent': 'CanjiBot/1.0' },
      // The full history is roughly 8 MB and the endpoint ignores every
      // pagination parameter, so this is one large request by necessity.
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      return json({ error: `History endpoint returned ${response.status}` }, 502);
    }

    payload = await response.json();
  } catch (error) {
    return json({ error: `Could not fetch history: ${String(error)}` }, 502);
  }

  const parsed = parseUpstream(
    payload,
    labelMap,
    (rateDate) => rateDate >= from && rateDate <= to
  );

  if (parsed.rates.length === 0) {
    return json({
      imported: 0,
      window: { from, to },
      unmapped: parsed.unmapped,
      message: 'Nothing to import in that window.',
    });
  }

  // Everything already stored for this window, so a re-run imports only what
  // is genuinely missing. Under append-only storage a careless second run
  // would otherwise double the history permanently.
  const { data: existing, error: existingError } = await supabase
    .from('rates')
    .select('currency_code, rate_date')
    .eq('market', 'official')
    .gte('rate_date', from)
    .lte('rate_date', to);

  if (existingError) return json({ error: existingError.message }, 500);

  const stored = new Set(
    (existing ?? [])
      .filter((row) => row.rate_date)
      .map((row) => storedKey(row.currency_code, row.rate_date!))
  );

  // The feed can carry more than one row for a pair; the first wins, matching
  // the daily fetch.
  const chosen = new Map<string, (typeof parsed.rates)[number]>();
  for (const rate of parsed.rates) {
    const key = storedKey(rate.currencyCode, rate.rateDate);
    if (!stored.has(key) && !chosen.has(key)) chosen.set(key, rate);
  }

  const toInsert = [...chosen.values()];
  let imported = 0;

  for (let index = 0; index < toInsert.length; index += INSERT_BATCH) {
    const batch = toInsert.slice(index, index + INSERT_BATCH);

    const { error: insertError } = await supabase.from('rates').insert(
      batch.map((rate) => ({
        currency_code: rate.currencyCode,
        market: 'official',
        buy: rate.buy,
        central: rate.central,
        sell: rate.sell,
        source_label: 'Central Bank of Nigeria (historical import)',
        rate_date: rate.rateDate,
      }))
    );

    if (insertError) {
      // Report what did land. Append-only means the completed batches stay,
      // and a re-run skips them.
      return json(
        { error: insertError.message, imported, window: { from, to } },
        500
      );
    }

    imported += batch.length;
  }

  await supabase.from('system_events').insert({
    kind: 'cbn_history_imported',
    detail: { imported, window: { from, to }, unmapped: parsed.unmapped },
  });

  return json({
    imported,
    window: { from, to },
    skippedAlreadyStored: parsed.rates.length - toInsert.length,
    unmapped: parsed.unmapped,
  });
});
