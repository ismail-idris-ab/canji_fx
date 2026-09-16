import type { ExpoConfig } from 'expo/config';

/**
 * Environment is surfaced here so the app reads it from one place.
 *
 * This deliberately warns rather than throws. EAS and Expo tooling evaluate
 * this config in contexts where the variables legitimately do not exist yet
 * — `eas env:create` being the obvious one, which cannot run if the config
 * it must read refuses to load without the values it is about to set.
 *
 * The hard failure lives at runtime in src/lib/env.ts instead, where a
 * missing value is unambiguously a real problem.
 *
 * Only client-safe values belong here. The Supabase service role key is set
 * in the Edge Function environment through the dashboard and must never
 * appear in this file, in .env, or anywhere in the repository.
 */
function fromEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    console.warn(
      `[canji] ${name} is not set. Fine for tooling; the app will refuse to start without it.`
    );
  }
  return value;
}

const config: ExpoConfig = {
  name: 'Canji',
  slug: 'canji',
  owner: 'aiiman-tech',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'canji',

  // Canji commits to a dark design; it does not follow the system theme.
  userInterfaceStyle: 'dark',

  android: {
    package: 'ng.canji.app',
    adaptiveIcon: {
      backgroundColor: '#0B0B0F',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },

  ios: {
    bundleIdentifier: 'ng.canji.app',
    icon: './assets/expo.icon',
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0B0F',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    supabaseUrl: fromEnv('EXPO_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: fromEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

    // Created by `eas init`. A dynamic config cannot be written to by the
    // EAS CLI, so this is set by hand. It is an identifier, not a secret.
    eas: {
      projectId: '7673f32c-e920-4ad2-8698-c04bb41acaf2',
    },
  },
};

export default config;
