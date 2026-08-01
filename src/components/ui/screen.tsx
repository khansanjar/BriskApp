import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: object;
  scrollProps?: ScrollViewProps;
  padded?: boolean;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  scrollProps,
  padded = true,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

  const inner = (
    <View
      style={[
        styles.inner,
        { maxWidth: MaxContentWidth, backgroundColor: theme.background },
        padded && styles.padded,
        contentStyle,
      ]}>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}>
        {inner}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.four },
          padded && styles.padded,
        ]}
        showsVerticalScrollIndicator={false}
        {...scrollProps}>
        {inner}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flexGrow: 1, width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six + BottomTabInset + Spacing.three },
});
