import { StyleSheet, Text, View } from 'react-native';

import { Colors, DriverStatusMeta, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

export function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const meta = DriverStatusMeta[status] ?? { label: status, tone: 'neutral' as Tone };
  const colors = toneColor(theme, meta.tone);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.fg }]} />
      <Text style={[styles.label, { color: colors.fg }]}>{meta.label}</Text>
    </View>
  );
}

function toneColor(
  theme: (typeof Colors)[keyof typeof Colors],
  tone: Tone
): { fg: string; bg: string } {
  switch (tone) {
    case 'brand':
      return { fg: theme.brand, bg: theme.brandSoft };
    case 'success':
      return { fg: theme.success, bg: theme.successSoft };
    case 'warning':
      return { fg: theme.warning, bg: theme.warningSoft };
    case 'danger':
      return { fg: theme.danger, bg: theme.dangerSoft };
    default:
      return { fg: theme.textSecondary, bg: theme.surfaceSecondary };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
});
