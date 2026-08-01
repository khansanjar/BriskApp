import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: string;
  containerStyle?: object;
}

export function TextField({
  label,
  error,
  leftIcon,
  placeholder,
  containerStyle,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  return (
    <View style={[{ width: '100%' }, containerStyle]}>
      {label ? <TextLabel>{label}</TextLabel> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: scale(1),
          borderRadius: moderateScale(16),
          paddingHorizontal: scale(Spacing.three),
          minHeight: isLandscape ? verticalScale(Spacing.five + 4) : verticalScale(Spacing.six + 4),
          backgroundColor: theme.surface,
          borderColor: error ? theme.danger : theme.border,
        }}>
        {leftIcon ? (
          <TextLabel style={{ color: theme.textSecondary, marginRight: scale(Spacing.two) }}>
            {leftIcon}
          </TextLabel>
        ) : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={{ flex: 1, fontSize: moderateScale(16), paddingVertical: verticalScale(Spacing.three), color: theme.text }}
          {...rest}
        />
      </View>
      {error ? (
        <TextLabel style={{ color: theme.danger, marginTop: verticalScale(Spacing.one) }}>{error}</TextLabel>
      ) : null}
    </View>
  );
}

function TextLabel({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  const { verticalScale, moderateScale } = useResponsive();
  return (
    <View>
      <Text style={[{ color: theme.textSecondary, fontSize: moderateScale(13), fontWeight: 600, marginBottom: verticalScale(6) }, style]}>
        {children}
      </Text>
    </View>
  );
}
