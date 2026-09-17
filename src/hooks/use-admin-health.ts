import { useCallback, useEffect, useState } from 'react';

import { registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

export type SystemEvent = {
  id: string;
  kind: string;
  detail: unknown;
  createdAt: Date;
};

/**
 * Operational visibility for the Admin.
 *
 * Registers the device to receive operational alerts, and surfaces recent
 * incidents in the admin area. A pipeline that breaks silently is the failure
 * mode this product cannot tolerate: readers keep seeing an ageing figure and
 * nothing complains. See ADR 0004.
 */
export function useAdminHealth(userId: string | null) {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [tokenState, setTokenState] = useState<
    'idle' | 'registered' | 'unavailable'
  >('idle');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('system_events')
      .select('id, kind, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    setEvents(
      (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        detail: row.detail,
        createdAt: new Date(row.created_at),
      }))
    );
  }, []);

  useEffect(() => {
    if (!userId) return;

    void load();

    // Registered separately from a Reader's Rate Alerts: an operational alert
    // is not a Rate Alert, must not count against the ten-alert cap, and must
    // survive the Admin tidying up their personal alerts.
    void (async () => {
      const registration = await registerForPush();

      if (registration.status !== 'granted') {
        setTokenState('unavailable');
        return;
      }

      const { error } = await supabase.from('admin_push_tokens').upsert({
        user_id: userId,
        expo_push_token: registration.token,
        updated_at: new Date().toISOString(),
      });

      setTokenState(error ? 'unavailable' : 'registered');
    })();
  }, [userId, load]);

  return { events, tokenState, refresh: load };
}
