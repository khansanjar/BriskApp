import Ionicons from '@react-native-vector-icons/ionicons';
import { type ComponentProps, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

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
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? theme.danger : theme.textSecondary;
  const circleBg = isDanger ? theme.dangerSoft : theme.surfaceSecondary;

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: compact ? verticalScale(Spacing.four) : isLandscape ? verticalScale(Spacing.three) : verticalScale(Spacing.six),
      paddingHorizontal: scale(Spacing.four),
      gap: verticalScale(Spacing.two),
    }}>
      <View
        style={{
          maxWidth: scale(72),
          maxHeight: scale(72),
          width: '30%',
          aspectRatio: 1,
          borderRadius: moderateScale(36),
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: verticalScale(Spacing.one),
          backgroundColor: circleBg,
          borderColor: theme.border,
        }}>
        <Ionicons name={icon} size={scale(32)} color={iconColor} />
      </View>
      <Text style={{ fontSize: moderateScale(17), fontWeight: 700, color: theme.text }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: moderateScale(14), textAlign: 'center', lineHeight: verticalScale(20), maxWidth: scale(280), color: theme.textSecondary }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: verticalScale(Spacing.two) }}>{action}</View> : null}
    </View>
  );
}
