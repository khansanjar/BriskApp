// src/app/(app)/(home)/_layout.tsx
import { Stack } from 'expo-router';

import { useThemeMode } from '@/theme/theme-context';

export default function HomeLayout() {
  const { colors: theme } = useThemeMode();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Dashboard',
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="booking/[id]"
        options={{
          title: 'Ride',
          headerLargeTitle: false,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text, fontWeight: '700' as const },
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      {/* <Stack.Screen
        name="booking/heading-to-pickup/[id]"
        options={{
          title: 'Heading to Pickup',
          headerLargeTitle: false,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text, fontWeight: '700' as const },
          contentStyle: { backgroundColor: theme.background },
        }}
      /> */}
    </Stack>
  );
}
