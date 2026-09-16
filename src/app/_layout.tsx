import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ensureAnonymousSession } from '@/lib/session';

export default function RootLayout() {
  useEffect(() => {
    // Fire and forget. Reading rates does not need a session, so this must
    // never gate the first paint — it only prepares the identity that Rate
    // Alerts will be owned by. See ADR 0002.
    void ensureAnonymousSession();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0B0F' },
        }}
      />
    </>
  );
}
