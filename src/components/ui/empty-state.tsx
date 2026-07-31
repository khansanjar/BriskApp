import Ionicons from '@react-native-vector-icons/ionicons';
import { type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IoniconName;
  title: string;
  description?: string;
  action?: ReactNode;
  /** `danger` tints the icon + circle for error states. */
  tone?: 'default' | 'danger';
  /** Reduces vertical padding for dense layouts (e.g. dashboard sections). */
  compact?: boolean;
}

export function EmptyState({
  icon = 'car-outline',
  title,
  description,
  action,
  tone = 'default',
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? theme.danger : theme.textSecondary;
  const circleBg = isDanger ? theme.dangerSoft : theme.surfaceSecondary;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: circleBg, borderColor: theme.border },
        ]}>
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  containerCompact: {
    paddingVertical: Spacing.four,
  },
  iconWrap: {
    maxWidth: 72,
    maxHeight: 72,
    width: '30%',
    aspectRatio: 1,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    marginTop: Spacing.two,
  },
});
