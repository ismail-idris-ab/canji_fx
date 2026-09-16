import Constants from 'expo-constants';

type Extra = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

/**
 * app.config.ts already throws if either value is absent at build time, so
 * reaching this module means they exist. The cast is narrowed by that
 * guarantee rather than by hope.
 */
const extra = Constants.expoConfig?.extra as Extra | undefined;

if (!extra?.supabaseUrl || !extra?.supabaseAnonKey) {
  throw new Error(
    'Supabase configuration missing from the app manifest. Rebuild after copying .env.example to .env.'
  );
}

export const env = {
  supabaseUrl: extra.supabaseUrl,
  supabaseAnonKey: extra.supabaseAnonKey,
} as const;
