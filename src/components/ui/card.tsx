// src/components/ui/card.tsx
import { PropsWithChildren } from 'react';
import { useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();

  return (
    <View
      style={[
        {
          borderRadius: isLandscape ? moderateScale(16) : moderateScale(20),
          padding: isLandscape ? scale(Spacing.two) : scale(Spacing.three),
          shadowColor: '#3D3796',
          shadowOffset: { width: 0, height: scale(6) },
          shadowRadius: scale(16),
          elevation: 4,
          backgroundColor: theme.surface,
          borderColor: isDark ? theme.border : 'transparent',
          borderWidth: isDark ? scale(1) : scale(0),
          shadowOpacity: isDark ? 0 : 0.06,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
