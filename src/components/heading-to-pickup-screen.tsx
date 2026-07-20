// src/components/heading-to-pickup-screen.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getBooking, updateBookingStatus, type Booking } from '@/lib/api';

const DEFAULT_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

interface HeadingToPickupScreenProps {
  bookingId: number;
}

export function HeadingToPickupScreen({ bookingId }: HeadingToPickupScreenProps) {
  const theme = useTheme();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBooking(bookingId);
      setBooking(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (active) {
          setLocationError('Location permission denied.');
          if (booking?.pickup_latitude && booking?.pickup_longitude) {
            setDriverLocation({ latitude: booking.pickup_latitude, longitude: booking.pickup_longitude });
          }
        }
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (active) {
          setDriverLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
        }
      } catch {
        if (active && booking?.pickup_latitude && booking?.pickup_longitude) {
          setDriverLocation({ latitude: booking.pickup_latitude, longitude: booking.pickup_longitude });
        }
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
          setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        },
      );
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [booking?.pickup_latitude, booking?.pickup_longitude]);

  const fitMapToRoute = useCallback(
    (coords: { latitude: number; longitude: number }[]) => {
      if (!mapRef.current || coords.length < 2) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    },
    [],
  );

  useEffect(() => {
    if (!driverLocation || !booking?.pickup_latitude || !booking?.pickup_longitude) return;

    const destination = {
      latitude: booking.pickup_latitude,
      longitude: booking.pickup_longitude,
    };

    fitMapToRoute([driverLocation, destination]);
  }, [driverLocation, booking?.pickup_latitude, booking?.pickup_longitude, fitMapToRoute]);

  const handleStart = useCallback(async () => {
    if (!booking) return;
    setStarting(true);
    setError(null);
    try {
      await updateBookingStatus(booking.booking_id, { status: 'in_progress' });
      router.replace(`/(app)/(bookings)/booking/${booking.booking_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start ride.');
    } finally {
      setStarting(false);
    }
  }, [booking, router]);

  const handleCall = useCallback(() => {
    if (!booking?.customer?.phone) return;
    Linking.openURL(`tel:${booking.customer.phone}`).catch(() => {
      Alert.alert('Unable to call', 'Please check your phone app settings.');
    });
  }, [booking?.customer?.phone]);

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
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

  const pickupCoord = {
    latitude: booking.pickup_latitude ?? DEFAULT_REGION.latitude,
    longitude: booking.pickup_longitude ?? DEFAULT_REGION.longitude,
  };

  const currentLocation = driverLocation ?? pickupCoord;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={currentLocation}
          title="Your location"
          description="Current position"
          identifier="driver"
        >
          <View style={styles.driverMarkerContainer}>
            <View style={[styles.driverMarkerDot, { backgroundColor: theme.brand }]} />
          </View>
        </Marker>

        <Marker
          coordinate={pickupCoord}
          title="Pickup"
          description={booking.pickup_location}
          identifier="pickup"
        >
          <View style={styles.endpointMarker}>
            <Ionicons name="location" size={28} color={theme.danger} />
          </View>
        </Marker>

        {driverLocation && googleApiKey && (
          <MapViewDirections
            origin={driverLocation}
            destination={pickupCoord}
            apikey={googleApiKey}
            strokeWidth={5}
            strokeColor={theme.brand}
            mode="DRIVING"
            resetOnChange={false}
            onReady={(result) => {
              if (result) {
                setRouteInfo({
                  distance: result.distance,
                  duration: result.duration,
                });
                fitMapToRoute([driverLocation, pickupCoord]);
              }
            }}
            onError={(err) => console.warn('Directions error:', err)}
          />
        )}
      </MapView>

      {locationError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <Text style={[styles.errorBannerText, { color: theme.danger }]}>{locationError}</Text>
        </View>
      )}

      <View style={[styles.bottomCard, { backgroundColor: theme.surface }]}>
        <View style={styles.customerSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Customer</Text>
          <View style={styles.customerRow}>
            <Avatar
              firstName={booking.customer?.name?.split(' ')[0] ?? ''}
              lastName={booking.customer?.name?.split(' ').slice(1).join(' ') || undefined}
              size={44}
              fallback="icon"
            />
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: theme.text }]}>
                {booking.customer?.name ?? 'Customer'}
              </Text>
              <Pressable onPress={handleCall} style={styles.callRow}>
                <Ionicons name="call" size={16} color={theme.brand} />
                <Text style={[styles.phoneText, { color: theme.brand }]}>
                  {booking.customer?.phone ?? ''}
                </Text>
              </Pressable>
              <Text style={[styles.customerEmail, { color: theme.textSecondary }]}>
                {booking.customer?.email ?? ''}
              </Text>
            </View>
          </View>
        </View>

        {routeInfo && (
          <View style={styles.etaRow}>
            <Ionicons name="time" size={16} color={theme.textSecondary} />
            <Text style={[styles.etaText, { color: theme.textSecondary }]}>
              {formatDuration(routeInfo.duration)} to pickup
            </Text>
            <Text style={[styles.distanceText, { color: theme.textSecondary }]}>
              {routeInfo.distance.toFixed(1)} km
            </Text>
          </View>
        )}

        {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

        <Button
          title="Start"
          onPress={handleStart}
          loading={starting}
          disabled={starting}
          style={styles.primaryButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
  driverMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  endpointMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Platform.select({ ios: Spacing.five, android: Spacing.six }),
    shadowColor: '#3D3796',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(61, 55, 150, 0.08)',
  },
  customerSection: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  customerInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customerEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: Spacing.two,
  },
  primaryButton: {
    marginTop: Spacing.three,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
});
