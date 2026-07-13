// src/components/ui/avatar.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { getInitials } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  photo?: string | null;
  size?: number;
  /** `initials` (default) shows the name initials; `icon` shows a user silhouette. */
  fallback?: 'initials' | 'icon';
}

export function Avatar({ firstName, lastName, photo, size = 48, fallback = 'initials' }: AvatarProps) {
  const theme = useTheme();
  const radius = size / 2;
  const initials = getInitials(firstName ?? '', lastName ?? '');
  const showIcon = fallback === 'icon' || !initials;

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
      {showIcon ? (
        <Ionicons name="person" size={size * 0.5} color={theme.brand} />
      ) : (
        <Text style={[styles.initials, { color: theme.brand, fontSize: size * 0.36 }]}>
          {initials}
        </Text>
      )}
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
