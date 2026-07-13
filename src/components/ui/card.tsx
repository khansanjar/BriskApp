// src/components/ui/card.tsx
import { PropsWithChildren } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          // Dark mode: shadows don't read well — use a border instead.
          borderColor: isDark ? theme.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
          shadowOpacity: isDark ? 0 : 0.06,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
});
