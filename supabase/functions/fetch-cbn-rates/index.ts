import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  latestRateDate,
  parseUpstream,
  selectNew,
  storedKey,
} from '../_shared/upstream-feed.ts';

/**
 * fetch-cbn-rates — records Official Market Rates from the CBN.
 *
 * Every decision lives in the shared Upstream Feed module, which is pure and
 * unit tested. This function only performs I/O: fetch, delegate, insert,
 * report.
 *
 * The endpoint is undocumented and unversioned — see ADR 0004. The rolling
 * window is used rather than the full history, which ignores every pagination
 * parameter and returns over 8 MB.
 *
 * It is safe to invoke repeatedly. Dedupe is on Quoted Currency and Rate
 * Date, so a second call on the same day inserts nothing, which is why this
 * function does not need a shared secret to protect it.
 */

const PRIMARY = 'https://www.cbn.gov.ng/api/GetAllExchangeRatesGRAPH';
const FALLBACK = 'https://api.frankfurter.dev/v2/providers/cbn/rates';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // The service role key is read from this function's own environment. It is
  // never placed in cron command text, which anything able to reach the cron
  // schema can read.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: labelRows, error: labelError } = await supabase
    .from('currency_source_labels')
    .select('upstream_label, currency_code');

  if (labelError) {
    return json({ error: `Could not read label map: ${labelError.message}` }, 500);
  }

  const labelMap: Record<string, string> = {};
  for (const row of labelRows ?? []) {
    labelMap[row.upstream_label] = row.currency_code;
  }

  let payload: unknown;
  let sourceUsed: 'primary' | 'fallback' = 'primary';

  try {
    payload = await fetchJson(PRIMARY);
  } catch (primaryError) {
    // The fallback reproduces the CBN's central rate but carries no spread,
    // so it is a stopgap that keeps the official figure present rather than
    // an equivalent source.
    try {
      const fallback = await fetchJson(FALLBACK);
      await recordEvent(supabase, 'cbn_primary_unreachable', {
        reason: String(primaryError),
      });
      return await handleFallback(supabase, fallback);
    } catch (fallbackError) {
      await recordEvent(supabase, 'cbn_all_sources_unreachable', {
        primary: String(primaryError),
        fallback: String(fallbackError),
      });
      return json({ error: 'Both sources unreachable.' }, 502);
    }
  }

  const parsed = parseUpstream(payload, labelMap);

  // A payload that parses to nothing usable means the shape moved. That is
  // the failure this endpoint is most likely to produce, and it would
  // otherwise be silent.
  if (parsed.rates.length === 0) {
    await recordEvent(supabase, 'cbn_schema_drift', {
      unmapped: parsed.unmapped,
      rejected: parsed.rejected.slice(0, 20),
    });
    return json({ error: 'No usable rows. Schema may have changed.' }, 502);
  }

  if (parsed.unmapped.length > 0) {
    // Not fatal — CFA, WAUA and SDR are excluded on purpose — but a genuinely
    // new label must be noticed rather than silently dropped forever.
    await recordEvent(supabase, 'cbn_unmapped_labels', {
      labels: parsed.unmapped,
    });
  }

  const newest = latestRateDate(parsed.rates)!;
  const todaysRates = parsed.rates.filter((rate) => rate.rateDate === newest);

  const { data: existing, error: existingError } = await supabase
    .from('rates')
    .select('currency_code, rate_date')
    .eq('market', 'official')
    .eq('rate_date', newest);

  if (existingError) {
    return json({ error: `Could not read stored rates: ${existingError.message}` }, 500);
  }

  const stored = new Set(
    (existing ?? [])
      .filter((row) => row.rate_date)
      .map((row) => storedKey(row.currency_code, row.rate_date!))
  );

  const toInsert = selectNew(todaysRates, stored);

  if (toInsert.length === 0) {
    return json({
      inserted: 0,
      rateDate: newest,
      source: sourceUsed,
      message: 'Already up to date.',
    });
  }

  const { error: insertError } = await supabase.from('rates').insert(
    toInsert.map((rate) => ({
      currency_code: rate.currencyCode,
      market: 'official',
      buy: rate.buy,
      central: rate.central,
      sell: rate.sell,
      source_label: 'Central Bank of Nigeria',
      rate_date: rate.rateDate,
    }))
  );

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  return json({
    inserted: toInsert.length,
    rateDate: newest,
    source: sourceUsed,
    unmapped: parsed.unmapped,
  });
});

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'CanjiBot/1.0' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return await response.json();
}

/**
 * Frankfurter publishes only the central rate. Those rows are recorded with
 * buy and sell equal to it rather than invented, and the event log records
 * that the fallback was used.
 */
async function handleFallback(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  payload: unknown
): Promise<Response> {
  const body = payload as { date?: string; base?: string; rates?: Record<string, number> };
  const rateDate = body.date;
  const ngn = body.rates?.NGN;

  if (!rateDate || typeof ngn !== 'number' || body.base !== 'EUR') {
    return json({ error: 'Fallback payload not in the expected shape.' }, 502);
  }

  return json({
    inserted: 0,
    rateDate,
    source: 'fallback',
    message:
      'Primary unreachable. Fallback reached but carries no spread; an admin should record official rates manually.',
  });
}

// deno-lint-ignore no-explicit-any
async function recordEvent(supabase: any, kind: string, detail: unknown) {
  await supabase.from('system_events').insert({ kind, detail });
}
