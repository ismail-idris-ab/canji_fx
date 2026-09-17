import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current instant, re-derived on a timer.
 *
 * Screens need one instant for a whole render so no two rows can disagree
 * about what time it is — but pinning it to the mount is wrong. Freshness is
 * derived from it, so a screen left open would keep claiming a Rate is Fresh
 * hours after it became Stale, and a Gap would keep rendering after its
 * inputs should have suppressed it. Leaving a screen open is exactly the
 * case realtime updates exist to serve.
 *
 * A minute is fine: the Freshness boundaries are hours apart, and nothing on
 * screen shows seconds.
 */
const TICK_MS = 60_000;

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);

    // A backgrounded app does not run timers reliably, so returning to it
    // could otherwise show an instant that is minutes or hours behind.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') setNow(new Date());
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return now;
}
