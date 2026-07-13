// src/components/ui/avatar.tsx
import { Image } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getInitials } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  photo?: string | null;
  size?: number;
}

export function Avatar({ firstName, lastName, photo, size = 48 }: AvatarProps) {
  const theme = useTheme();
  const radius = size / 2;
  const initials = getInitials(firstName ?? '', lastName ?? '');

  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.brandSoft,
        },
      ]}>
      <Text style={[styles.initials, { color: theme.brand, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: 700,
  },
});
