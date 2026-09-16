import { useCallback, useEffect, useState } from 'react';

import type { Currency, Rate } from '@/domain/types';
import { readCache, writeCache } from '@/lib/cache';
import { supabase } from '@/lib/supabase';

/**
 * Loads Rates and Quoted Currencies, showing the cached payload immediately
 * and replacing it once the network answers.
 *
 * `origin` is surfaced rather than hidden. A Reader looking at cached data
 * during a failed refresh is entitled to know that is what they are seeing —
 * the Freshness badge already tells them how old the Rate is, and this tells
 * them Canji has not managed to check for a newer one.
 */

export type RateData = {
  rates: Rate[];
  currencies: Currency[];
};

export type RateDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'ready';
      data: RateData;
      origin: 'cache' | 'network';
      /** Set when cached data is shown because a refresh failed. */
      refreshError: string | null;
      retry: () => void;
    };

async function fetchFromNetwork(): Promise<RateData> {
  const [ratesResult, currenciesResult] = await Promise.all([
    supabase
      .from('latest_rates')
      .select(
        'currency_code, market, buy, central, sell, source_label, rate_date, created_at'
      ),
    supabase
      .from('currencies')
      .select('code, name, flag_emoji, tracked_parallel, has_official')
      .order('sort_order'),
  ]);

  if (ratesResult.error) throw new Error(ratesResult.error.message);
  if (currenciesResult.error) throw new Error(currenciesResult.error.message);

  const rates: Rate[] = [];

  for (const row of ratesResult.data ?? []) {
    // latest_rates is a view, so PostgREST types every column as nullable.
    // Rows missing what makes a Rate meaningful are skipped rather than
    // rendered as blanks a Reader would have to interpret.
    if (!row.currency_code || !row.market || !row.source_label) continue;
    if (!row.created_at) continue;

    rates.push({
      currencyCode: row.currency_code,
      market: row.market,
      buy: row.buy,
      central: row.central,
      sell: row.sell,
      sourceLabel: row.source_label,
      rateDate: row.rate_date,
      observedAt: new Date(row.created_at),
    });
  }

  return {
    rates,
    currencies: (currenciesResult.data ?? []).map((row) => ({
      code: row.code,
      name: row.name,
      flagEmoji: row.flag_emoji,
      trackedParallel: row.tracked_parallel,
      hasOfficial: row.has_official,
    })),
  };
}

export function useRateData(): RateDataState {
  const [state, setState] = useState<RateDataState>({ status: 'loading' });

  const refresh = useCallback(async (cached: RateData | null) => {
    try {
      const data = await fetchFromNetwork();
      void writeCache(data);
      setState({
        status: 'ready',
        data,
        origin: 'network',
        refreshError: null,
        retry: () => void refresh(data),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Network request failed';

      // With a cache, a failed refresh is a caveat on real data. Without one,
      // there is nothing to show and it is simply an error.
      if (cached) {
        setState({
          status: 'ready',
          data: cached,
          origin: 'cache',
          refreshError: message,
          retry: () => void refresh(cached),
        });
      } else {
        setState({
          status: 'error',
          message,
          retry: () => void refresh(null),
        });
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached = await readCache();

      // Paint cached data first so the app opens with rates rather than a
      // spinner, then let the network correct it.
      if (cached && !cancelled) {
        setState({
          status: 'ready',
          data: cached,
          origin: 'cache',
          refreshError: null,
          retry: () => void refresh(cached),
        });
      }

      if (!cancelled) await refresh(cached);
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return state;
}
