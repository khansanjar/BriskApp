import { Text, View } from 'react-native';

import { Colors, DriverStatusMeta, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

export function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  const meta = DriverStatusMeta[status] ?? { label: status, tone: 'neutral' as Tone };
  const colors = toneColor(theme, meta.tone);
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: scale(6),
      paddingHorizontal: scale(Spacing.two),
      paddingVertical: verticalScale(Spacing.half),
      borderRadius: moderateScale(999),
      backgroundColor: colors.bg,
    }}>
      <View style={{ width: scale(7), height: scale(7), borderRadius: moderateScale(4), backgroundColor: colors.fg }} />
      <Text style={{ fontSize: moderateScale(12), fontWeight: 700, textTransform: 'capitalize', color: colors.fg }}>{meta.label}</Text>
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
