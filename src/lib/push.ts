import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { registerDeviceToken } from '@/lib/api';

// Remote push (expo-notifications) was removed from Expo Go in SDK 53+.
// Detecting it lets us skip push setup so the app never crashes in Expo Go.
const IS_EXPO_GO =
  String(Constants.executionEnvironment) === 'storeClient' ||
  String(Constants.executionEnvironment) === 'guest';

/**
 * Requests an Expo push token and registers it with the backend via
 * POST /device-token. Best-effort: any failure (or an environment without
 * push support) is swallowed so the app keeps working. expo-notifications is
 * imported lazily so merely importing this module never throws.
 */
export async function registerPushToken(): Promise<void> {
  if (IS_EXPO_GO || Platform.OS === 'web' || !Device.isDevice) {
    return;
  }
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      await registerDeviceToken(tokenData.data);
    }
  } catch {
    /* push setup is optional */
  }
}
