import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  const { isLandscape } = useResponsive();
  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: theme.brand }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  containerLandscape: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
  },
  action: {
    fontSize: 14,
    fontWeight: 700,
  },
});
