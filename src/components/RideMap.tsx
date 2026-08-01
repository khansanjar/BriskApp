import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Colors, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useBookingCoordinates } from '@/hooks/use-booking-coordinates';
import type { Booking } from '@/lib/api';
import { useThemeMode } from '@/theme/theme-context';

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

// Statuses where the route should point at the DROPOFF instead of the pickup.
const DROPOFF_PHASE_STATUSES = ['arrived', 'in_progress'];

function decodePolyline(encoded: string) {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >>> 1) : result >>> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >>> 1) : result >>> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export function RideMap({ booking }: { booking?: Booking | null }) {
  const { resolvedScheme } = useThemeMode();
  const { isLandscape, screenWidth, scale, verticalScale, wp, hp } = useResponsive();
  const [driver, setDriver] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const { pickup, dropoff } = useBookingCoordinates(booking);

  // Which leg of the trip are we on? Drives both the destination and the marker/route styling.
  const isDropoffPhase = booking?.driver_status ? DROPOFF_PHASE_STATUSES.includes(booking.driver_status) : false;
  const destination = isDropoffPhase ? dropoff : pickup;

  useEffect(() => {
    let active = true;

     (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) setError('Location permission denied.');
          return;
        }

        try {
          const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (active) {
            setDriver({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
          }
         } catch (error) {
          console.warn('[RideMap Location Error]:', error);
          // Live watch below will populate this shortly; nothing to fall back to here.
        }

        try {
          watchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
            (loc) => {
              if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
              if (active) {
                setDriver({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                setError(null);
              }
            }
          );
        } catch (watchErr) {
          console.warn('watchPositionAsync failed (location settings unsatisfied):', watchErr);
          if (active) {
            setError('Location tracking unavailable. Check your device GPS settings.');
          }
        }
      } catch (permErr) {
        console.warn('requestForegroundPermissionsAsync failed (location settings unsatisfied):', permErr);
        if (active) {
          setError('Location access unavailable. Check your device GPS settings.');
        }
      }
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      if (!driver || !destination) {
        setRouteCoords([]);
        setRouteUnavailable(false);
        return;
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) {
        setRouteUnavailable(true);
        return;
      }

      try {
        const url = `${GOOGLE_DIRECTIONS_URL}?origin=${driver.latitude},${driver.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (cancelled) return;

        if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
          setRouteCoords(decodePolyline(data.routes[0].overview_polyline.points));
          setRouteUnavailable(false);
        } else {
          setRouteCoords([]);
          setRouteUnavailable(true);
        }
      } catch (error) {
        console.warn('[RideMap Route Fetch Error]:', error);
        if (!cancelled) {
          setRouteCoords([]);
          setRouteUnavailable(true);
        }
      }
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
    // Use primitives, not object refs, so this doesn't re-fire on every render
    // just because useBookingCoordinates returned a new object identity.
  }, [driver?.latitude, driver?.longitude, destination?.latitude, destination?.longitude]);

  const region = useMemo(() => {
    if (driver) {
      return { latitude: driver.latitude, longitude: driver.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
    }
    if (destination) {
      return { latitude: destination.latitude, longitude: destination.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
    }
    // No hardcoded fallback location — if we truly have nothing yet, don't render a region at all.
    return null;
  }, [driver, destination]);

  const brand = resolvedScheme === 'dark' ? '#7C74E0' : '#3D3796';

  const markers = [
    ...(pickup ? [{ id: booking?.booking_id ?? 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, title: 'Pickup' }] : []),
    ...(dropoff ? [{ id: `${booking?.booking_id ?? 'dropoff'}-dropoff`, latitude: dropoff.latitude, longitude: dropoff.longitude, title: 'Dropoff' }] : []),
  ];

  if (error) {
    return (
      <View style={[styles.fallback, { backgroundColor: Colors[resolvedScheme].background }]}>
        <Text style={[styles.fallbackText, { color: Colors[resolvedScheme].textSecondary }]}>
          {error} Map unavailable.
        </Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.fullscreen}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fullscreen, isLandscape && styles.fullscreenLandscape]}>
      <MapView
        style={[styles.map, isLandscape && styles.mapLandscape]}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            pinColor={marker.title === 'Pickup' ? '#FF4444' : '#3D3796'}
          />
        ))}

        {driver && (
          <Marker coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} title="Your location" description="Current position">
            <View style={styles.userMarker}>
              <View style={[styles.userMarkerDot, { backgroundColor: brand }]} />
            </View>
          </Marker>
        )}

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={brand} strokeWidth={5} />
        )}
      </MapView>

      {!driver ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      ) : null}

      {routeUnavailable ? (
        <View style={[styles.routeBanner, { backgroundColor: Colors[resolvedScheme].surface }]}>
          <Text style={[styles.routeBannerText, { color: Colors[resolvedScheme].textSecondary }]}>
            Route unavailable — showing {isDropoffPhase ? 'dropoff' : 'pickup'} location only
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, width: '100%', height: '100%' },
  fullscreenLandscape: { flex: 1, width: '100%', height: '100%' },
  map: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  mapLandscape: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  fallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  fallbackText: { fontSize: 14, textAlign: 'center' },
  routeBanner: {
    position: 'absolute', top: Spacing.two + Spacing.half, left: Spacing.two + Spacing.half, right: Spacing.two + Spacing.half, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two + Spacing.one + Spacing.half, borderWidth: 1, borderColor: 'rgba(61, 55, 150, 0.15)',
  },
  routeBannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  userMarker: { alignItems: 'center', justifyContent: 'center' },
  userMarkerDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#ffffff' },
});