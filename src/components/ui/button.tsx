// src/components/ui/button.tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
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

  const bg = variant === 'primary' ? theme.brand : variant === 'destructive' ? theme.danger : theme.surface;
  const borderColor = variant === 'secondary' ? theme.border : bg;
  const textColor = variant === 'secondary' ? theme.text : theme.brandText;

  const isPrimary = variant === 'primary';
  const shadowColor = isPrimary ? (variant === 'primary' ? theme.brand : theme.danger) : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          shadowColor,
          shadowOpacity: isPrimary && !disabled && !loading ? 0.25 : 0,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: isPrimary && !disabled && !loading ? 4 : 0,
        },
        disabled || loading ? styles.disabled : null,
        pressed && !disabled && !loading ? styles.pressed : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
