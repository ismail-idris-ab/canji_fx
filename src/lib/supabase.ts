import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { env } from './env';

/**
 * One client for the whole app.
 *
 * Sessions persist in AsyncStorage so a Reader's anonymous identity survives
 * a restart — without that, every launch would mint a new anonymous user and
 * orphan their Rate Alerts.
 *
 * detectSessionInUrl is off because that behaviour is for browser redirect
 * flows and has no meaning in a native app.
 *
 * Typed against the generated Database, so a column rename in a migration
 * becomes a compile error rather than an undefined at runtime. Regenerate
 * with `npm run db:types` after every migration.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Confirms the configured project URL and anon key are both valid.
 *
 * This asks the auth service for its public settings, which is the endpoint
 * an anon key is actually entitled to read. PostgREST's root document is not
 * usable here: it now rejects everything but the service_role key.
 *
 * It is a configuration check, not a health check, and deliberately does not
 * depend on any table existing.
 */
export async function checkSupabaseReachable(): Promise<
  { ok: true; anonymousSignInsEnabled: boolean } | { ok: false; reason: string }
> {
  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `Auth settings returned ${response.status}. Check the anon key matches this project.`,
      };
    }

    const settings = (await response.json()) as {
      external?: { anonymous_users?: boolean };
    };

    return {
      ok: true,
      anonymousSignInsEnabled: settings.external?.anonymous_users === true,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}
