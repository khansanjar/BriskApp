// src/components/ui/button.tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'destructive';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const theme = useTheme();
  const { isLandscape } = useResponsive();

  const bg = variant === 'primary' ? theme.brand : variant === 'destructive' ? theme.danger : theme.surface;
  const borderColor = variant === 'secondary' ? theme.border : bg;
  const textColor = variant === 'secondary' ? theme.text : theme.brandText;

  const isAction = variant === 'primary' || variant === 'destructive';
  const shadow = variant === 'primary' ? theme.brand : variant === 'destructive' ? theme.danger : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          shadowColor: shadow,
          shadowOpacity: isAction && !disabled && !loading ? 0.25 : 0,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: isAction && !disabled && !loading ? 4 : 0,
        },
        disabled || loading ? styles.disabled : null,
        pressed && !disabled && !loading ? styles.pressed : null,
        isLandscape && styles.baseLandscape,
        style,
      ]}>
      <View style={styles.contentRow}>
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        {loading && <ActivityIndicator color={textColor} style={styles.spinner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseLandscape: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  spinner: {
    marginLeft: Spacing.two,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
