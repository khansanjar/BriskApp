import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const { isLandscape } = useResponsive();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, isLandscape && styles.landscape, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  landscape: {
    borderRadius: 12,
  },
});
