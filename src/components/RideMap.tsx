import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import MapWebview from '@/components/MapWebview';
import { Colors, Spacing } from '@/constants/theme';
import { useThemeMode } from '@/theme/theme-context';
import type { Booking } from '@/lib/api';

const DEFAULT_REGION = { latitude: 40.4168, longitude: -3.7038 };

type Coords = { latitude: number; longitude: number };

/**
 * Standalone, full-screen map for the dashboard. It tracks the driver's live
 * location and geocodes the assigned ride's pickup address, then draws driving
 * directions from the driver to that pickup point. All data is derived from the
 * existing booking payload + the device GPS — no new API calls are introduced.
 */
export function RideMap({ booking }: { booking?: Booking | null }) {
  const { resolvedScheme } = useThemeMode();
  const [driver, setDriver] = useState<Coords | null>(null);
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Live driver location.
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
          setDriver({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }
      } catch {
        /* keep null until watch delivers a point */
      }

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
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  // Geocode the assigned ride's pickup address into coordinates.
  useEffect(() => {
    let active = true;
    if (!booking?.pickup_location) {
      setPickup(null);
      return;
    }
    Location.geocodeAsync(booking.pickup_location)
      .then((results) => {
        if (active && results[0]) {
          setPickup({ latitude: results[0].latitude, longitude: results[0].longitude });
        }
      })
      .catch(() => {
        if (active) setPickup(null);
      });
    return () => {
      active = false;
    };
  }, [booking?.pickup_location]);

  const region = driver ?? pickup ?? DEFAULT_REGION;
  const brand = resolvedScheme === 'dark' ? '#7C74E0' : '#3D3796';

  const directions =
    driver && pickup
      ? {
          origin: driver,
          destination: pickup,
          strokeColor: brand,
          strokeWidth: 5,
        }
      : null;

  const markers = pickup
    ? [
        {
          id: booking?.booking_id ?? 'pickup',
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          title: booking?.pickup_location ?? 'Pickup',
        },
      ]
    : [];

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
      <MapWebview
        region={region}
        markers={markers}
        userLocation={driver}
        directions={directions}
      />
      {!driver ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={brand} />
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
});
