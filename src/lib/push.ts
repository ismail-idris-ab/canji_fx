import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Push registration.
 *
 * Notification permission is requested only when a Reader creates their first
 * Rate Alert, never at launch. Asking on first open — before anyone knows
 * what the app does — is how permission prompts get denied permanently, and
 * the whole app works without it.
 */

export type PushRegistration =
  | { status: 'granted'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string };

export function configureNotificationHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPush(): Promise<PushRegistration> {
  // A simulator has no push token to give. Saying so plainly beats a confusing
  // permission failure during development.
  if (!Device.isDevice) {
    return {
      status: 'unavailable',
      reason: 'Push notifications need a physical device.',
    };
  }

  if (Platform.OS === 'android') {
    // Android requires a channel before anything can be delivered.
    await Notifications.setNotificationChannelAsync('rate-alerts', {
      name: 'Rate alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F5B301',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) return { status: 'denied' };

  // projectId is populated automatically in a development build, but the Expo
  // documentation recommends passing it explicitly, and a bare build without
  // it fails at runtime rather than at build time.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return {
      status: 'unavailable',
      reason: 'This build has no EAS project id, so it cannot receive push.',
    };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'granted', token: token.data };
  } catch (error) {
    return {
      status: 'unavailable',
      reason:
        error instanceof Error ? error.message : 'Could not obtain a push token.',
    };
  }
}
