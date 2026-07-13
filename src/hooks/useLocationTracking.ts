// src/hooks/useLocationTracking.ts
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { postLocationBatch, type DriverStatus } from '@/lib/api';

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
