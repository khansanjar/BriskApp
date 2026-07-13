// src/app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import Constants from 'expo-constants';
import Ionicons from '@react-native-vector-icons/ionicons';

import { router } from 'expo-router';
import { useThemeMode } from '@/theme/theme-context';
import { registerPushToken } from '@/lib/push';

// Remote push was removed from Expo Go in SDK 53+; skip it there so the app
// (and its route tree) never crashes.
const IS_EXPO_GO =
  String(Constants.executionEnvironment) === 'storeClient' ||
  String(Constants.executionEnvironment) === 'guest';

export default function AppLayout() {
  const { colors } = useThemeMode();

  useEffect(() => {
    // Register / refresh the Expo push token once the driver is signed in.
    if (IS_EXPO_GO) return;
    registerPushToken().catch(() => {});
  }, []);

  useEffect(() => {
    // Tapping a push notification with a booking_id deep-links to that ride.
    if (IS_EXPO_GO) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as { booking_id?: number };
          if (data?.booking_id) {
            router.push(`/(app)/(bookings)/booking/${data.booking_id}`);
          }
        });
      } catch {
        /* push not available in this environment */
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: 'Rides',
          tabBarIcon: ({ color, size }) => <Ionicons name="car" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(notifications)"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
