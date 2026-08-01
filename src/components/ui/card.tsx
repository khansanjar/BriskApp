// src/components/ui/card.tsx
import { PropsWithChildren } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { isLandscape } = useResponsive();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isDark ? theme.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
          shadowOpacity: isDark ? 0 : 0.06,
        },
        isLandscape && styles.cardLandscape,
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
    shadowColor: '#3D3796',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  cardLandscape: {
    borderRadius: 16,
    padding: Spacing.two,
  },
});
