import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Colors, Spacing } from '@/constants/theme';
import { useBookingCoordinates } from '@/hooks/use-booking-coordinates';
import type { Booking } from '@/lib/api';
import { useThemeMode } from '@/theme/theme-context';

const DEFAULT_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

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
  const [driver, setDriver] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const { pickup, dropoff } = useBookingCoordinates(booking);

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (active) setError('Location permission denied.');
        return;
      }
      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (active) {
          const coords = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
          console.log('[RideMap] Initial driver location:', coords);
          setDriver(coords);
        }
      } catch (err) {
        console.log('[RideMap] Initial location error:', err);
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
          if (active) {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            console.log('[RideMap] Driver location update:', coords);
            setDriver(coords);
            setError(null);
          }
        }
      );
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
      if (!driver || !pickup) {
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
        const url = `${GOOGLE_DIRECTIONS_URL}?origin=${driver.latitude},${driver.longitude}&destination=${pickup.latitude},${pickup.longitude}&key=${apiKey}`;
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
      } catch (err) {
        console.log('[RideMap] Directions fetch error:', err);
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
  }, [driver, pickup]);

  const region = useMemo(() => {
    if (driver) {
      return {
        latitude: driver.latitude,
        longitude: driver.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    return DEFAULT_REGION;
  }, [driver]);

  const brand = resolvedScheme === 'dark' ? '#7C74E0' : '#3D3796';

  const markers = [
    ...(pickup
      ? [
          {
            id: booking?.booking_id ?? 'pickup',
            latitude: pickup.latitude,
            longitude: pickup.longitude,
            title: 'Pickup',
          },
        ]
      : []),
    ...(dropoff
      ? [
          {
            id: `${booking?.booking_id ?? 'dropoff'}-dropoff`,
            latitude: dropoff.latitude,
            longitude: dropoff.longitude,
            title: 'Dropoff',
          },
        ]
      : []),
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

  return (
    <View style={styles.fullscreen}>
      <MapView
        style={styles.map}
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
            pinColor={marker.title === 'Pickup' ? '#FF4444' : marker.title === 'Dropoff' ? '#3D3796' : undefined}
          />
        ))}

        {driver && (
          <Marker
            coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
            title="Your location"
            description="Current position"
          >
            <View style={styles.userMarker}>
              <View style={[styles.userMarkerDot, { backgroundColor: brand }]} />
            </View>
          </Marker>
        )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={brand}
            strokeWidth={5}
          />
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
            Route unavailable — showing pickup location only
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  map: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: 'center',
  },
  routeBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(61, 55, 150, 0.15)',
  },
  routeBannerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
