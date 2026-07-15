// src/components/booking-detail-screen.tsx
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { BookingDetail } from '@/components/booking-detail';

export function BookingDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const { booking, loading, updating, declining, error, update, decline } = useBookingDetail(id);

  // Background breadcrumb collection while heading to / at / in the ride.
  useLocationTracking(booking?.booking_id ?? null, booking?.driver_status ?? null);

  const handleDecline = async () => {
    try {
      await decline();
      if (router.canGoBack()) {
        router.back();
      }
    } catch (e) {
      Alert.alert(
        'Could not decline ride',
        e instanceof Error ? e.message : 'Please try again.'
      );
    }
  };

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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}>
      <BookingDetail
        booking={booking}
        onUpdate={update}
        updating={updating}
        onDecline={handleDecline}
        declining={declining}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { fontSize: 15, textAlign: 'center' },
});
