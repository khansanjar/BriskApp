// src/app/(app)/_layout.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Tabs, router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { Spacing, TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT, ScreenHorizontalMargin } from '@/constants/theme';
import { registerPushToken } from '@/lib/push';
import { useThemeMode } from '@/theme/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
// Remote push was removed from Expo Go in SDK 53+; skip it there so the app
// (and its route tree) never crashes.
const IS_EXPO_GO =
  String(Constants.executionEnvironment) === 'storeClient' ||
  String(Constants.executionEnvironment) === 'guest';

export default function AppLayout() {
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();
  const didForceHome = useRef(false);

  // 1. Force App to start at Home Tab on fresh launch/restart
  useEffect(() => {
    if (!didForceHome.current) {
      didForceHome.current = true;
      requestAnimationFrame(() => {
        router.replace('/(app)/(home)');
      });
    }
  }, []);

  // 2. Register / refresh Expo push token once driver is signed in
  useEffect(() => {
    if (IS_EXPO_GO) return;
    registerPushToken().catch((error) => {
      console.error('[AppLayout Push Registration Error]:', error);
    });
  }, []);

  // 3. Handle Push Notification Taps (Deep Linking)
  useEffect(() => {
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
      initialRouteName="(home)"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarIcon,
        tabBarInactiveTintColor: colors.tabBarIcon,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          marginHorizontal: ScreenHorizontalMargin,
          bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET,
          height: TAB_BAR_HEIGHT,
          borderRadius: 24,
          backgroundColor: colors.tabBarBackground,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          borderCurve: 'continuous',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 8,
          paddingBottom: 0,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          borderRadius: 24,
          paddingVertical: 8,
        },
        tabBarIconStyle: { marginTop: 0 },
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: 'Rides',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'car' : 'car-outline'} color={color} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(notifications)"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} color={color} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={focused ? size + 2 : size} />
          ),
        }}
      />
    </Tabs>
  );
}