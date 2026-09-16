import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * The Quoted Currencies Canji reports, in display order.
 *
 * `hasOfficial` is false for currencies traded on the Nigerian street but
 * not published by the CBN — CAD today. Those must say so plainly, because
 * a blank official figure otherwise reads as a defect.
 */
export type Currency = {
  code: string;
  name: string;
  flagEmoji: string;
  trackedParallel: boolean;
  hasOfficial: boolean;
};

export type CurrenciesState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; currencies: Currency[]; retry: () => void };

export function useCurrencies(): CurrenciesState {
  const [state, setState] = useState<CurrenciesState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    const { data, error } = await supabase
      .from('currencies')
      .select('code, name, flag_emoji, tracked_parallel, has_official')
      .order('sort_order');

    if (error) {
      setState({
        status: 'error',
        message: error.message,
        retry: () => void load(),
      });
      return;
    }

    setState({
      status: 'ready',
      retry: () => void load(),
      currencies: (data ?? []).map((row) => ({
        code: row.code,
        name: row.name,
        flagEmoji: row.flag_emoji,
        trackedParallel: row.tracked_parallel,
        hasOfficial: row.has_official,
      })),
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
