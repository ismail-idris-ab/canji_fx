import { describe, expect, it } from 'vitest';

import { latestRateDate, parseUpstream } from '@/domain/upstream-feed';

/**
 * Contract test against the live CBN endpoint.
 *
 * The endpoint is undocumented and unversioned. Its likeliest failure is not
 * an outage but a silent reshape — a 200 response whose fields have been
 * renamed or whose dates changed format — which every error handler in the
 * pipeline would sail straight past. See ADR 0004.
 *
 * This is the only test permitted to touch the network. It is deliberately
 * separated from the unit suite and run as its own CI job, so a CBN outage
 * reddens a job that means "the upstream moved" rather than blocking a push
 * that has nothing to do with it.
 *
 * If this fails, check the endpoint by hand before changing the parser. A
 * green unit suite with a red contract test means the code is still correct
 * and the world changed.
 */

const ENDPOINT = 'https://www.cbn.gov.ng/api/GetAllExchangeRatesGRAPH';

// The mapping as seeded in 20260915120100_seed_currencies.sql.
const LABELS: Record<string, string> = {
  'US DOLLAR': 'USD',
  'POUNDS STERLING': 'GBP',
  'POUND STERLING': 'GBP',
  EURO: 'EUR',
  'SWISS FRANC': 'CHF',
  YEN: 'JPY',
  'YUAN/RENMINBI': 'CNY',
  'SOUTH AFRICAN RAND': 'ZAR',
  'UAE DIRHAM': 'AED',
  RIYAL: 'SAR',
  'DANISH KRONA': 'DKK',
};

async function fetchFeed(): Promise<unknown> {
  const response = await fetch(ENDPOINT, {
    headers: { Accept: 'application/json', 'User-Agent': 'CanjiBot/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  expect(
    response.ok,
    `CBN endpoint returned ${response.status}. The pipeline cannot record official rates.`
  ).toBe(true);

  return await response.json();
}

describe('the live CBN feed', { timeout: 60_000 }, () => {
  it('still parses into usable Rates with the seeded label mapping', async () => {
    const parsed = parseUpstream(await fetchFeed(), LABELS);

    expect(
      parsed.rates.length,
      `No usable rows. Shape may have changed. Rejected: ${JSON.stringify(
        parsed.rejected.slice(0, 5)
      )}`
    ).toBeGreaterThan(0);

    // The US dollar is the reason this product exists. If nothing else, it
    // must be present and mappable.
    expect(parsed.rates.some((rate) => rate.currencyCode === 'USD')).toBe(true);
  });

  it('carries a rate date within the last week', async () => {
    const parsed = parseUpstream(await fetchFeed(), LABELS);
    const newest = latestRateDate(parsed.rates);

    expect(newest).not.toBeNull();

    const age = Date.now() - Date.parse(`${newest}T00:00:00Z`);
    const days = age / (24 * 60 * 60 * 1000);

    // A 200 response carrying a month-old figure is the silent failure this
    // whole test exists to catch. A week allows for holidays.
    expect(days, `Newest rate date is ${newest}, ${days.toFixed(1)} days old`)
      .toBeLessThan(8);
  });

  it('reports only the non-consumer units as unmapped', async () => {
    const parsed = parseUpstream(await fetchFeed(), LABELS);

    // CFA, WAUA and SDR are excluded on purpose. Anything else appearing here
    // is a currency the CBN has started publishing that Canji is silently
    // dropping, and the mapping table should be extended.
    const unexpected = parsed.unmapped.filter(
      (label) => !['CFA', 'WAUA', 'SDR'].includes(label)
    );

    expect(
      unexpected,
      `New upstream labels seen: ${unexpected.join(', ')}. Add them to currency_source_labels or confirm they should be excluded.`
    ).toEqual([]);
  });
});
