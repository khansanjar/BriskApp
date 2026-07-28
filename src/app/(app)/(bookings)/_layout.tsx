// src/app/(app)/(bookings)/_layout.tsx
import { Stack } from 'expo-router';

import { useThemeMode } from '@/theme/theme-context';

export default function BookingsLayout() {
  const { colors: theme } = useThemeMode();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Rides',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text, fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="booking/[id]"
        options={{ title: 'Ride', headerLargeTitle: false, headerBackTitle: 'Back' }}
      />
      {/* <Stack.Screen
        name="booking/heading-to-pickup/[id]"
        options={{ title: 'Heading to Pickup', headerLargeTitle: false, headerBackTitle: 'Back' }}
      /> */}
    </Stack>
  );
}
