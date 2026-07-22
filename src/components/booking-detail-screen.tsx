// src/components/booking-detail-screen.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActiveRideScreen } from '@/components/ActiveRideScreen';
import { BookingDetail } from '@/components/booking-detail';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useBookingCoordinates } from '@/hooks/use-booking-coordinates';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useTheme } from '@/hooks/use-theme';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { type DriverStatus } from '@/lib/api';

const FALLBACK_COORDINATES = { latitude: 0, longitude: 0 };

export function BookingDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const { booking, loading, updating, cancelling, error, update, cancel, reload } = useBookingDetail(id);
  const { pickup: geocodedPickup, dropoff: geocodedDropoff } = useBookingCoordinates(booking);

  useLocationTracking(booking?.booking_id ?? null, booking?.driver_status ?? null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    return () => {
      // Cleanup when booking ID changes
    };
  }, [id]);

  const handleCancel = async (reason?: string) => {
    try {
      await cancel(reason);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(app)/(bookings)');
      }
    } catch (e) {
      Alert.alert(
        'Could not cancel ride',
        e instanceof Error ? e.message : 'Please try again.'
      );
    }
  };

  const handleUpdate = useCallback(
    async (status: DriverStatus) => {
      try {
        await update(status);
      } catch (e) {
        Alert.alert(
          'Could not update status',
          e instanceof Error ? e.message : 'Please try again.'
        );
      }
    },
    [update]
  );

  if (loading && !booking) {
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

  // Use unified ActiveRideScreen for all active ride statuses
  if (['heading_to_pickup', 'arrived', 'in_progress'].includes(booking.driver_status)) {
    return (
      <ActiveRideScreen
        booking={booking}
        pickupCoords={geocodedPickup}
        dropoffCoords={geocodedDropoff}
        onStatusChange={handleUpdate}
        onRideComplete={() => reload()}
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}>
      <BookingDetail
        booking={booking}
        onUpdate={handleUpdate}
        updating={updating}
        onCancel={handleCancel}
        cancelling={cancelling}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, paddingBottom: Spacing.six + BottomTabInset + Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { fontSize: 15, textAlign: 'center' },
});
