// src/components/booking-detail-screen.tsx
import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActiveRideScreen, type RideDetails, type RideStatus } from '@/components/ActiveRideScreen';
import { BookingDetail } from '@/components/booking-detail';
import { HeadingToPickupScreen } from '@/components/heading-to-pickup-screen';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useBookingCoordinates } from '@/hooks/use-booking-coordinates';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useTheme } from '@/hooks/use-theme';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { type Booking, type DriverStatus } from '@/lib/api';

const FALLBACK_COORDINATES = { latitude: 40.4168, longitude: -3.7038 };

export function BookingDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const { booking, loading, updating, cancelling, error, update, cancel } = useBookingDetail(id);
  const { pickup: geocodedPickup, dropoff: geocodedDropoff } = useBookingCoordinates(booking);

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

  if (booking.driver_status === 'heading_to_pickup') {
    return <HeadingToPickupScreen bookingId={booking.booking_id} />;
  }

  if (['arrived', 'in_progress'].includes(booking.driver_status)) {
    const rideDetails = buildRideDetails(booking, geocodedPickup, geocodedDropoff);
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

function buildRideDetails(
  booking: Booking,
  geocodedPickup: { latitude: number; longitude: number } | null,
  geocodedDropoff: { latitude: number; longitude: number } | null,
): RideDetails {
  const fallback = FALLBACK_COORDINATES;
  return {
    driverLocation: fallback,
    pickupLocation: {
      latitude: geocodedPickup?.latitude ?? booking.pickup_latitude ?? fallback.latitude,
      longitude: geocodedPickup?.longitude ?? booking.pickup_longitude ?? fallback.longitude,
      address: booking.pickup_location,
    },
    dropoffLocation: {
      latitude: geocodedDropoff?.latitude ?? booking.dropoff_latitude ?? fallback.latitude,
      longitude: geocodedDropoff?.longitude ?? booking.dropoff_longitude ?? fallback.longitude,
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
