import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Currency, Rate } from '@/domain/types';
import { readCache, writeCache } from '@/lib/cache';
import { supabase } from '@/lib/supabase';

/**
 * Loads Rates and Quoted Currencies, shows the cached payload immediately,
 * replaces it once the network answers, and keeps it current.
 *
 * Live updates subscribe to inserts on the `rates` base table, not to
 * `latest_rates`. A Postgres publication cannot contain a view, so the view
 * can never emit events. On each insert the view is refetched rather than
 * the in-memory list being patched from the payload: patching would
 * reimplement the newest-per-pair rule in a second place, and a divergence
 * between the two shows up as a wrong number on screen.
 *
 * `origin` is surfaced rather than hidden. A Reader looking at cached data
 * during a failed refresh is entitled to know that is what they are seeing.
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
      /** True while a refresh runs behind data already on screen. */
      refreshing: boolean;
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

  // The last good payload, so a failed refresh can fall back to it without
  // the refresh function depending on render state.
  const lastGood = useRef<RateData | null>(null);

  const refresh = useCallback(async ({ silent }: { silent: boolean }) => {
    if (silent && lastGood.current) {
      setState((current) =>
        current.status === 'ready' ? { ...current, refreshing: true } : current
      );
    }

    try {
      const data = await fetchFromNetwork();
      lastGood.current = data;
      void writeCache(data);

      setState({
        status: 'ready',
        data,
        origin: 'network',
        refreshError: null,
        refreshing: false,
        retry: () => void refresh({ silent: true }),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Network request failed';

      // With data in hand, a failed refresh is a caveat on real rates.
      // Without any, there is nothing to show and it is simply an error.
      if (lastGood.current) {
        setState({
          status: 'ready',
          data: lastGood.current,
          origin: 'cache',
          refreshError: message,
          refreshing: false,
          retry: () => void refresh({ silent: true }),
        });
      } else {
        setState({
          status: 'error',
          message,
          retry: () => void refresh({ silent: false }),
        });
      }
    }
  }, []);

  // Initial load: paint the cache, then correct it from the network.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached = await readCache();

      if (cached && !cancelled) {
        lastGood.current = cached;
        setState({
          status: 'ready',
          data: cached,
          origin: 'cache',
          refreshError: null,
          refreshing: true,
          retry: () => void refresh({ silent: true }),
        });
      }

      if (!cancelled) await refresh({ silent: Boolean(cached) });
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Live updates. An insert on `rates` means a new observation exists, so
  // refetch the view; the payload itself is deliberately not trusted to
  // decide which Rate is now live.
  useEffect(() => {
    const channel = supabase
      .channel('rates-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rates' },
        () => void refresh({ silent: true })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  // A backgrounded app misses realtime events, so returning to it refetches
  // rather than trusting whatever was last on screen.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh({ silent: true });
    });

    return () => subscription.remove();
  }, [refresh]);

  return state;
}
