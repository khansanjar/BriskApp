import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <TextLabel>{label}</TextLabel> : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}>
        {leftIcon ? (
          <TextLabel style={{ color: theme.textSecondary, marginRight: Spacing.two }}>
            {leftIcon}
          </TextLabel>
        ) : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          {...rest}
        />
      </View>
      {error ? (
        <TextLabel style={{ color: theme.danger, marginTop: Spacing.one }}>{error}</TextLabel>
      ) : null}
    </View>
  );
}

function TextLabel({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={[{ color: theme.textSecondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }, style]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
});
