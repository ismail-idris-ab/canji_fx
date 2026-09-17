import { useCallback, useEffect, useState } from 'react';

import type { DailyRate } from '@/domain/history';
import { supabase } from '@/lib/supabase';

/**
 * Daily Rates for one Quoted Currency, both Markets, all of history.
 *
 * Fetched in pages because PostgREST caps a response at 1,000 rows and USD
 * alone has more than 6,000 official days going back to 2001. The whole
 * history is loaded once and then sliced locally by range, which keeps range
 * switching instant — the alternative, a request per range, would make the
 * most-used interaction on the screen the slowest.
 *
 * Deliberately not cached offline. The rate cache exists so a Reader on a
 * weak connection still sees today's figure, which is the app working at all;
 * a chart is something you go looking at, and a stale series risks the same
 * class of error the Freshness rules exist to prevent.
 */

const PAGE = 1000;
const MAX_PAGES = 12; // ~12,000 days: well beyond any single currency's history.

export type HistoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; rates: DailyRate[]; retry: () => void };

export function useHistory(currencyCode: string): HistoryState {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    const collected: DailyRate[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const { data, error } = await supabase
        .from('daily_rates')
        .select('currency_code, market, day, buy, central, sell')
        .eq('currency_code', currencyCode)
        .order('day', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);

      if (error) {
        setState({
          status: 'error',
          message: error.message,
          retry: () => void load(),
        });
        return;
      }

      const rows = data ?? [];

      for (const row of rows) {
        // daily_rates is a view, so PostgREST types every column nullable.
        // A row missing what identifies it cannot be plotted.
        if (!row.currency_code || !row.market || !row.day) continue;

        collected.push({
          currencyCode: row.currency_code,
          market: row.market,
          day: row.day,
          buy: row.buy,
          central: row.central,
          sell: row.sell,
        });
      }

      if (rows.length < PAGE) break;
    }

    setState({ status: 'ready', rates: collected, retry: () => void load() });
  }, [currencyCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
