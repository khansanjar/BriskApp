// src/hooks/useLocationTracking.ts
import { postLocationBatch, type DriverStatus } from '@/lib/api';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

// Simple in-memory queue for this session. For a production app, back this with
// expo-file-system or a small SQLite table so points survive an app kill.
let queue: { lat: number; lng: number; timestamp: string; heading?: number; speed?: number }[] = [];

async function flush(bookingId: number) {
  if (queue.length === 0) return;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const toSend = queue;
  queue = [];
  try {
    await postLocationBatch(bookingId, toSend);
  } catch {
    // Put them back if the send failed (e.g. booking just completed -> 400 is fine to drop)
    queue = [...toSend, ...queue];
  }
}

export function useLocationTracking(bookingId: number | null, status: DriverStatus | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const shouldTrack =
      bookingId != null && (status === 'heading_to_pickup' || status === 'in_progress' || status === 'arrived');

    if (!shouldTrack) {
      watchRef.current?.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 0 },
        (loc) => {
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return; // skip zero points
          queue.push({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            timestamp: new Date(loc.timestamp).toISOString(),
            heading: loc.coords.heading ?? undefined,
            speed: loc.coords.speed ?? undefined,
          });
        }
      );

      intervalRef.current = setInterval(() => flush(bookingId!), 10000);
    })();

    return () => {
      watchRef.current?.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bookingId, status]);
}

/**
 * Real-time driver location hook for UI updates.
 * Provides current driver location with single GPS subscription.
 * Used by ActiveRideScreen for map rendering and routing.
 */
export function useDriverLocation(
  enabled: boolean,
  fallbackLocation?: { latitude: number; longitude: number } | null
) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(fallbackLocation ?? null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    let active = true;

    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        if (active) {
          setError('Location permission denied.');
          if (fallbackLocation) setLocation(fallbackLocation);
        }
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (active) {
          setLocation({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }
      } catch {
        if (active && fallbackLocation) {
          setLocation(fallbackLocation);
        }
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
          if (active) {
            setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        }
      );
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [enabled, fallbackLocation]);

  return { location, error };
}
