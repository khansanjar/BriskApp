import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';

export function BrandHeader({ tagline }: { tagline?: string }) {
  const theme = useTheme();
  const { isLandscape } = useResponsive();
  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View style={[styles.logo, { backgroundColor: theme.brand }]}>
        <Text style={styles.logoText}>B</Text>
      </View>
      <Text style={[styles.name, { color: theme.text }]}>Brisk Transfers</Text>
      {tagline ? (
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  containerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: 800,
  },
  name: {
    fontSize: 26,
    fontWeight: 800,
  },
  tagline: {
    fontSize: 14,
    fontWeight: 500,
  },
});
