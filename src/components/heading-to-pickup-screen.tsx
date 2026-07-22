// src/components/heading-to-pickup-screen.tsx
// ⚠️ DEPRECATED: This component has been merged into ActiveRideScreen.tsx
// Use ActiveRideScreen instead for all active ride statuses (heading_to_pickup, arrived, in_progress)
// This file is kept for reference only and should not be imported in new code.

import Ionicons from '@react-native-vector-icons/ionicons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooking, updateBookingStatus, type Booking } from '@/lib/api';

interface HeadingToPickupScreenProps {
  bookingId: number;
  onStatusUpdate?: () => void;
}

export function HeadingToPickupScreen({ bookingId, onStatusUpdate }: HeadingToPickupScreenProps) {
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
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval:10 },
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

  const pickupCoord = useMemo(() => ({
    latitude: booking?.pickup_latitude ?? driverLocation?.latitude ?? 0,
    longitude: booking?.pickup_longitude ?? driverLocation?.longitude ?? 0,
  }), [booking?.pickup_latitude, booking?.pickup_longitude, driverLocation]);

  const currentLocation = driverLocation ?? pickupCoord;

  console.log('[HeadingToPickup] Pickup point:', pickupCoord);
  console.log('[HeadingToPickup] Driver location:', currentLocation);

  useEffect(() => {
    if (!driverLocation || !booking) return;

    fitMapToRoute([driverLocation, pickupCoord]);
  }, [driverLocation, booking, pickupCoord, fitMapToRoute]);

  const handleArrived = useCallback(async () => {
    if (!booking) return;
    setStarting(true);
    setError(null);
    try {
      await updateBookingStatus(booking.booking_id, { status: 'arrived' });
      await load();
      onStatusUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark arrived.');
    } finally {
      setStarting(false);
    }
  }, [booking, load, onStatusUpdate]);

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  // If we don't have valid coordinates yet, show loading
  const hasValidCoordinates = pickupCoord.latitude !== 0 && pickupCoord.longitude !== 0;

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

  if (!hasValidCoordinates) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: pickupCoord.latitude,
          longitude: pickupCoord.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
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
        <View style={styles.compactTop}>
          <View style={[styles.compactIcon, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name="location" size={20} color={theme.brand} />
          </View>
          <View style={styles.compactRoute}>
            <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
              {booking.pickup_location}
            </Text>
          </View>
          <StatusBadge status="heading_to_pickup" />
        </View>

        <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Customer</Text>
            <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>
              {booking.customer?.name ?? 'Customer'}
            </Text>
            {booking.customer?.phone ? (
              <Text style={[styles.metaContact, { color: theme.brand }]} numberOfLines={1}>
                {booking.customer.phone}
              </Text>
            ) : null}
            {booking.customer?.email ? (
              <Text style={[styles.metaContact, { color: theme.textSecondary }]} numberOfLines={1}>
                {booking.customer.email}
              </Text>
            ) : null}
          </View>
          {routeInfo && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>ETA</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>
                {formatDuration(routeInfo.duration)} · {routeInfo.distance.toFixed(1)} km
              </Text>
            </View>
          )}
        </View>

        {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

        <Button
          title="Arrived"
          onPress={handleArrived}
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
    bottom: BottomTabInset + Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRoute: { flex: 1, gap: 1 },
  compactPoint: { fontSize: 13, fontWeight: 700 },
  compactMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flex: 1, gap: 1 },
  metaLabel: { fontSize: 10, fontWeight: 600, opacity: 0.85 },
  metaValue: { fontSize: 12, fontWeight: 600 },
  metaContact: { fontSize: 11, fontWeight: 500 },
  primaryButton: {
    marginTop: Spacing.two,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
});
