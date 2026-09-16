import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * One shared subscription to Rate inserts for the whole app.
 *
 * Several screens observe Rates at once — the Rates tab, the converter, and
 * the admin entry screen all stay mounted. Each opening its own channel
 * would mean duplicate websockets and one refetch per screen per insert.
 * Worse, supabase-js returns the *same* channel object for a given topic, so
 * a second caller would invoke `.on()` on an already-subscribed channel,
 * which throws.
 *
 * So the channel is created once for the first listener and torn down after
 * the last one leaves. The topic carries a sequence number because removal
 * is asynchronous: a rapid unsubscribe-then-resubscribe, as React does in
 * development, would otherwise try to reuse a topic still being cleaned up.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;
let sequence = 0;

export function subscribeToRateInserts(listener: Listener): () => void {
  listeners.add(listener);

  if (!channel) {
    sequence += 1;
    channel = supabase
      .channel(`canji-rates-${sequence}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rates' },
        () => {
          // A copy, so a listener removing itself during dispatch cannot
          // disturb the iteration.
          for (const notify of [...listeners]) notify();
        }
      )
      .subscribe();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && channel) {
      const closing = channel;
      channel = null;
      void supabase.removeChannel(closing);
    }
  };
}
