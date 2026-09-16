import { useCallback, useEffect, useState } from 'react';

import type { AlertDirection, WatchedSide } from '@/domain/alert-engine';
import type { Market } from '@/domain/types';
import { registerForPush } from '@/lib/push';
import { ensureAnonymousSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export const MAX_ACTIVE_ALERTS = 10;

export type RateAlert = {
  id: string;
  currencyCode: string;
  market: Market;
  watchedSide: WatchedSide;
  direction: AlertDirection;
  threshold: number;
  active: boolean;
  lastFiredAt: Date | null;
};

export type NewAlert = {
  currencyCode: string;
  market: Market;
  direction: AlertDirection;
  threshold: number;
};

export type AlertsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'ready';
      alerts: RateAlert[];
      create: (alert: NewAlert) => Promise<CreateOutcome>;
      remove: (id: string) => Promise<void>;
      retry: () => void;
    };

export type CreateOutcome =
  | { ok: true }
  | { ok: false; reason: string; permissionDenied?: boolean };

/**
 * The side an alert watches, by Market.
 *
 * Sell for the Parallel Market, because that is what a Reader pays to obtain
 * foreign currency. Central for the Official Market, because no retail
 * counterparty exists there and the other two figures are not achievable.
 */
export function defaultWatchedSide(market: Market): WatchedSide {
  return market === 'parallel' ? 'sell' : 'central';
}

export function useAlerts(): AlertsState {
  const [state, setState] = useState<AlertsState>({ status: 'loading' });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('rate_alerts')
      .select(
        'id, currency_code, market, watched_side, direction, threshold, active, last_fired_at'
      )
      .order('created_at', { ascending: false });

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
      create,
      remove,
      alerts: (data ?? []).map((row) => ({
        id: row.id,
        currencyCode: row.currency_code,
        market: row.market,
        watchedSide: row.watched_side,
        direction: row.direction,
        threshold: Number(row.threshold),
        active: row.active,
        lastFiredAt: row.last_fired_at ? new Date(row.last_fired_at) : null,
      })),
    });
  }, []);

  const create = useCallback(
    async (alert: NewAlert): Promise<CreateOutcome> => {
      // Permission is asked for here, at the moment a Reader has shown they
      // want notifications, rather than at launch.
      const registration = await registerForPush();

      if (registration.status === 'denied') {
        return {
          ok: false,
          permissionDenied: true,
          reason:
            'Canji cannot send alerts without notification permission. You can turn it on in your phone settings.',
        };
      }

      if (registration.status === 'unavailable') {
        return { ok: false, reason: registration.reason };
      }

      // An alert is owned by auth.uid(), so the device needs an identity. It
      // normally has one from launch; this covers a sign-in that failed then.
      const session = await ensureAnonymousSession();
      if (!session.signedIn) {
        return {
          ok: false,
          reason: 'Could not reach the sign-in service. Try again shortly.',
        };
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { ok: false, reason: 'No session. Try again shortly.' };
      }

      const { error } = await supabase.from('rate_alerts').insert({
        user_id: user.user.id,
        expo_push_token: registration.token,
        currency_code: alert.currencyCode,
        market: alert.market,
        watched_side: defaultWatchedSide(alert.market),
        direction: alert.direction,
        threshold: alert.threshold,
      });

      if (error) {
        // The cap is a database trigger, so this is the authoritative answer
        // rather than a count the screen happened to make.
        return {
          ok: false,
          reason:
            error.code === '23514'
              ? `You can hold ${MAX_ACTIVE_ALERTS} active alerts. Delete one to add another.`
              : error.message,
        };
      }

      await load();
      return { ok: true };
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('rate_alerts').delete().eq('id', id);
      await load();
    },
    [load]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
