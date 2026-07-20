// src/components/booking-detail-screen.tsx
import { useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { type Booking, type DriverStatus, updateBookingStatus } from '@/lib/api';
import { ActiveRideScreen, type RideDetails, type RideStatus } from '@/components/ActiveRideScreen';
import { HeadingToPickupScreen } from '@/components/heading-to-pickup-screen';
import { BookingDetail } from '@/components/booking-detail';

const FALLBACK_COORDINATES = { latitude: 40.4168, longitude: -3.7038 };

export function BookingDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const { booking, loading, updating, cancelling, error, update, cancel } = useBookingDetail(id);

  useLocationTracking(booking?.booking_id ?? null, booking?.driver_status ?? null);

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
      if (status === 'heading_to_pickup') {
        try {
          await updateBookingStatus(id, { status });
          router.replace(`/(app)/(bookings)/booking/heading-to-pickup/${id}`);
        } catch (e) {
          Alert.alert(
            'Could not update status',
            e instanceof Error ? e.message : 'Please try again.'
          );
        }
      } else {
        update(status);
      }
    },
    [id, update, router]
  );

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

  const activeStatuses: DriverStatus[] = ['assigned', 'heading_to_pickup', 'arrived', 'in_progress'];

  if (booking.driver_status === 'heading_to_pickup') {
    return <HeadingToPickupScreen bookingId={booking.booking_id} />;
  }

  if (['assigned', 'arrived', 'in_progress'].includes(booking.driver_status)) {
    const rideDetails = buildRideDetails(booking);
    const initialStatus = mapStatusToRideStatus(booking.driver_status);

    return (
      <ActiveRideScreen
        rideDetails={rideDetails}
        initialStatus={initialStatus}
        onMarkArrived={() => update('arrived')}
        onStartRide={() => update('in_progress')}
        onCompleteRide={() => update('completed')}
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

function buildRideDetails(booking: Booking): RideDetails {
  const fallback = FALLBACK_COORDINATES;
  return {
    driverLocation: fallback,
    pickupLocation: {
      latitude: booking.pickup_latitude ?? fallback.latitude,
      longitude: booking.pickup_longitude ?? fallback.longitude,
      address: booking.pickup_location,
    },
    dropoffLocation: {
      latitude: booking.dropoff_latitude ?? fallback.latitude,
      longitude: booking.dropoff_longitude ?? fallback.longitude,
      address: booking.dropoff_location,
    },
    customer: {
      name: booking.customer?.name ?? 'Customer',
      phone: booking.customer?.phone ?? '',
      email: booking.customer?.email ?? '',
      avatar: null,
    },
  };
}

function mapStatusToRideStatus(status: DriverStatus): RideStatus {
  switch (status) {
    case 'assigned':
    case 'heading_to_pickup':
      return 'EN_ROUTE_TO_PICKUP';
    case 'arrived':
      return 'ARRIVED_AT_PICKUP';
    case 'in_progress':
      return 'EN_ROUTE_TO_DESTINATION';
    default:
      return 'EN_ROUTE_TO_PICKUP';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, paddingBottom: Spacing.six + BottomTabInset + Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { fontSize: 15, textAlign: 'center' },
});
