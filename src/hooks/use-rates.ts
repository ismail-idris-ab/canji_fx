import { useCallback, useEffect, useState } from 'react';

import type { Rate } from '@/domain/types';
import { supabase } from '@/lib/supabase';

/**
 * Fetches the live Rates and hands them to callers as domain Rates.
 *
 * The translation from database row to domain type happens here, in the
 * shell, so that the Rate Book never learns what Supabase looks like. That
 * is what keeps it testable without a database.
 */

export type RatesState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; rates: Rate[]; retry: () => void };

export function useRates(): RatesState {
  const [state, setState] = useState<RatesState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    const { data, error } = await supabase
      .from('latest_rates')
      .select(
        'currency_code, market, buy, central, sell, source_label, rate_date, created_at'
      );

    if (error) {
      setState({
        status: 'error',
        message: error.message,
        retry: () => void load(),
      });
      return;
    }

    const rates: Rate[] = [];

    for (const row of data ?? []) {
      // latest_rates is a view, so PostgREST types every column as nullable.
      // Rows missing the fields that make a Rate meaningful are skipped
      // rather than rendered as blanks a Reader would have to interpret.
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

    setState({ status: 'ready', rates, retry: () => void load() });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
