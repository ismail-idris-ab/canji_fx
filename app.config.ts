import type { ExpoConfig } from 'expo/config';

/**
 * Environment is read here rather than inline at the call site so that a
 * missing value fails at startup with a named error, instead of surfacing
 * later as an opaque network failure.
 *
 * Only client-safe values belong here. The Supabase service role key is set
 * in the Edge Function environment through the dashboard and must never
 * appear in this file, in .env, or anywhere in the repository.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

const config: ExpoConfig = {
  name: 'Canji',
  slug: 'canji',
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
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
};

export default config;
