// src/components/booking-detail-screen.tsx
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { BookingDetail } from '@/components/booking-detail';

export function BookingDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const { booking, loading, updating, error, update } = useBookingDetail(id);

  // Background breadcrumb collection while heading to / at / in the ride.
  useLocationTracking(booking?.booking_id ?? null, booking?.driver_status ?? null);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {error ?? 'Booking not found.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BookingDetail booking={booking} onUpdate={update} updating={updating} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { fontSize: 15, textAlign: 'center' },
});
