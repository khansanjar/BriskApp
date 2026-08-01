// src/components/ui/button.tsx
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

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
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();

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
        {
          borderRadius: moderateScale(16),
          borderWidth: 1,
          paddingVertical: isLandscape ? verticalScale(Spacing.two) : verticalScale(Spacing.three),
          paddingHorizontal: isLandscape ? scale(Spacing.three) : scale(Spacing.four),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderColor,
          shadowColor: shadow,
          shadowOpacity: isAction && !disabled && !loading ? 0.25 : 0,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: isAction && !disabled && !loading ? 4 : 0,
        },
        disabled || loading ? { opacity: 0.5 } : null,
        pressed && !disabled && !loading ? { opacity: 0.85 } : null,
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(Spacing.two) }}>
        <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: textColor }}>{title}</Text>
        {loading && <ActivityIndicator color={textColor} style={{ marginLeft: scale(Spacing.two) }} />}
      </View>
    </Pressable>
  );
}
