// src/app/(app)/(notifications)/_layout.tsx
import { Stack } from 'expo-router';

import { useThemeMode } from '@/theme/theme-context';

export default function NotificationsLayout() {
  const { colors: theme } = useThemeMode();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Alerts',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text, fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}
      />
    </Stack>
  );
}
