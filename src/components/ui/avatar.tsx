// src/components/ui/avatar.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { getInitials } from '@/lib/format';

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
  const { isLandscape, scale, moderateScale } = useResponsive();
  const displaySize = isLandscape ? Math.max(size, 32) : size;
  const radius = displaySize / 2;
  const initials = getInitials(firstName ?? '', lastName ?? '');
  const showIcon = fallback === 'icon' || !initials;

  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ borderWidth: scale(1), borderColor: 'rgba(0,0,0,0.06)', width: displaySize, height: displaySize, borderRadius: radius }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: displaySize,
        height: displaySize,
        borderRadius: radius,
        backgroundColor: theme.brandSoft,
      }}>
      {showIcon ? (
        <Ionicons name="person" size={scale(displaySize * 0.5)} color={theme.brand} />
      ) : (
        <Text style={{ fontWeight: 700, color: theme.brand, fontSize: moderateScale(displaySize * 0.36) }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
