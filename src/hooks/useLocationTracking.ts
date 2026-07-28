// src/hooks/useLocationTracking.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postLocationBatch, type DriverStatus } from '@/lib/api';
import { AppState, AppStateStatus, Linking, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

let TaskManager: typeof import('expo-task-manager') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManager = require('expo-task-manager');
} catch {
  TaskManager = null;
}

const LOCATION_TASK_NAME = 'background-location-tracking';
const QUEUE_KEY = '@pending_location_queue';
const LOCATION_QUEUE_MAX = 500;

// Cached region string from driver's current location
let cachedRegion: string | null = null;
let regionCacheTimestamp: number = 0;
const REGION_CACHE_DURATION = 5 * 60 * 1000;

type QueuedLocation = {
  lat: number;
  lng: number;
  timestamp: string;
  heading?: number;
  speed?: number;
};

/**
 * Open device settings so the user can grant location permissions manually.
 */
export function openAppSettings(): void {
  Linking.openSettings();
}

/**
 * Check if location services are enabled and permissions are granted.
 * Safely handles unsatisfied settings without throwing unhandled exceptions.
 */
async function ensureLocationServicesEnabled(): Promise<boolean> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert(
        'Location Access Required',
        'Please turn on your device GPS to receive accurate ride updates and navigation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
      return false;
    }

    const { status: permStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (permStatus === 'granted') {
      return true;
    }

    if (permStatus === 'denied' && !canAskAgain) {
      Alert.alert(
        'Location Access Required',
        'Please grant location permissions in your device settings to receive accurate ride updates and navigation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
      return false;
    }

    const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
    if (newStatus !== 'granted') {
      Alert.alert(
        'Location Access Required',
        'Please grant location permissions to receive accurate ride updates and navigation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Location services check failed:', error);
    return false;
  }
}

/**
 * Extract region (City, Country) from coordinates using reverse geocoding.
 */
export async function extractRegionFromCoords(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const now = Date.now();

  if (cachedRegion && (now - regionCacheTimestamp) < REGION_CACHE_DURATION) {
    return cachedRegion;
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const place = results[0];
      const city = place.city || place.subregion || place.district || place.region;
      const country = place.country;

      if (city && country) {
        const region = `${city}, ${country}`;
        cachedRegion = region;
        regionCacheTimestamp = now;
        return region;
      } else if (city) {
        cachedRegion = city;
        regionCacheTimestamp = now;
        return city;
      }
    }
  } catch (error) {
    console.warn('Error extracting region from coordinates:', error);
  }

  return null;
}

/**
 * Get the current region bias for geocoding.
 */
export async function getRegionBias(
  rideCoords?: { latitude: number; longitude: number } | null,
  driverOperatingRegion?: string | null
): Promise<string | null> {
  try {
    const hasLocation = await ensureLocationServicesEnabled();
    if (hasLocation) {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region = await extractRegionFromCoords(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
      if (region) return region;
    }
  } catch (error) {
    console.warn('GPS region bias failed:', error);
  }

  if (rideCoords) {
    try {
      const region = await extractRegionFromCoords(rideCoords.latitude, rideCoords.longitude);
      if (region) return region;
    } catch (error) {
      console.warn('Ride coords region bias failed:', error);
    }
  }

  return driverOperatingRegion ?? null;
}

/**
 * Saves a single location point to persistent AsyncStorage queue.
 * Reads existing queue, appends the new point, and writes back.
 * Safely handles JSON parse/stringify errors and queue size limits.
 */
async function saveLocationOffline(point: QueuedLocation): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const existing: QueuedLocation[] = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(existing)) {
      return;
    }

    existing.push(point);

    if (existing.length > LOCATION_QUEUE_MAX) {
      existing.splice(0, existing.length - LOCATION_QUEUE_MAX);
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to save location to persistent queue:', error);
  }
}

/**
 * Batch-flushes pending locations from AsyncStorage to the server.
 * On success, clears the sent batch from storage.
 * On failure, keeps the locations for the next retry attempt.
 */
async function flushPendingLocations(bookingId: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;

    const pending: QueuedLocation[] = JSON.parse(raw);
    if (!Array.isArray(pending) || pending.length === 0) return;

    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const toSend = pending.slice(0, LOCATION_QUEUE_MAX);

    try {
      await postLocationBatch(bookingId, toSend);
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch {
      // Keep locations in storage for retry on next flush cycle.
    }
  } catch (error) {
    console.warn('Error flushing location queue:', error);
  }
}

/**
 * Background task that receives location updates from the OS even when
 * the app is in the background or killed.
 * Writes each coordinate directly to persistent AsyncStorage.
 */
TaskManager?.defineTask?.(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Background location task error:', error);
    return;
  }

  const locations =
    (data as { locations?: Location.LocationObject[] })?.locations;
  if (!locations || !Array.isArray(locations)) {
    return;
  }

  for (const loc of locations) {
    if (loc.coords.latitude === 0 && loc.coords.longitude === 0) continue;

    try {
      await saveLocationOffline({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: new Date(loc.timestamp).toISOString(),
        heading: loc.coords.heading ?? undefined,
        speed: loc.coords.speed ?? undefined,
      });
    } catch (saveErr) {
      console.warn('Failed to save background location to queue:', saveErr);
    }
  }
});

/**
 * Hook that manages persistent location tracking for an active ride.
 * Uses AsyncStorage-backed queue and expo-task-manager background updates.
 * Automatically resumes tracking when app returns to foreground after permission grant.
 */
export function useLocationTracking(bookingId: number | null, status: DriverStatus | null) {
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive =
    bookingId != null &&
    (status === 'heading_to_pickup' || status === 'in_progress' || status === 'arrived');

  // AppState listener: auto-resume tracking when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') {
        appStateRef.current = nextAppState;
        return;
      }

      // App transitioned to foreground — silently re-check permissions
      appStateRef.current = nextAppState;

      if (!isActive) return;

      try {
        const hasLocation = await ensureLocationServicesEnabled();
        if (!hasLocation) return;

        // If tracking was stopped due to permission denial, restart it
        if (!hasStartedRef.current && isActive) {
          try {
            const taskManagerAvailable = TaskManager ? await TaskManager.isAvailableAsync() : false;
            if (!taskManagerAvailable) {
              console.warn('TaskManager not available — background tracking will not start');
            }

            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000,
              distanceInterval: 10,
              foregroundService: {
                notificationTitle: 'Location Tracking Active',
                notificationBody: 'Tracking driver location for active ride.',
              },
            });

            hasStartedRef.current = true;
            setIsTracking(true);
            setError(null);

            flushIntervalRef.current = setInterval(() => {
              if (bookingId) {
                flushPendingLocations(bookingId);
              }
            }, 10000);
          } catch (startErr) {
            console.warn('Resumed tracking failed (location settings unsatisfied):', startErr);
            setError('Location tracking unavailable. Check your device GPS settings.');
            hasStartedRef.current = false;
          }
        }
      } catch (permErr) {
        console.warn('Foreground permission re-check failed:', permErr);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, bookingId]);

  // Main tracking effect: starts background location updates and flush interval
  useEffect(() => {
    if (!isActive) {
      flushIntervalRef.current && clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
      hasStartedRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsTracking(false);
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    (async () => {
      try {
        const hasLocation = await ensureLocationServicesEnabled();
        if (!hasLocation) {
          hasStartedRef.current = false;
          setIsTracking(false);
          return;
        }

        // Defensive check: ensure TaskManager native module is available
        const taskManagerAvailable = TaskManager ? await TaskManager.isAvailableAsync() : false;
        if (!taskManagerAvailable) {
          console.warn('TaskManager not available — background tracking will not start');
        }

        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: 'Location Tracking Active',
              notificationBody: 'Tracking driver location for active ride.',
            },
          });
        } catch (startErr) {
          console.warn('startLocationUpdatesAsync failed (location settings unsatisfied):', startErr);
          hasStartedRef.current = false;
          setIsTracking(false);
          setError('Location tracking unavailable. Check your device GPS settings.');
          return;
        }

        setIsTracking(true);
        setError(null);

        flushIntervalRef.current = setInterval(() => {
          if (bookingId) {
            flushPendingLocations(bookingId);
          }
        }, 10000);
      } catch (error) {
        console.warn('Error starting persistent location tracking:', error);
        hasStartedRef.current = false;
        setIsTracking(false);
      }
    })();

    return () => {
      flushIntervalRef.current && clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
      hasStartedRef.current = false;
      setIsTracking(false);
    };
  }, [bookingId, status, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flushIntervalRef.current && clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    };
  }, []);

  return { isTracking, error, openAppSettings };
}

/**
 * Stops background location updates for the current ride.
 * Call this when the ride is completed or cancelled.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    console.warn('Failed to stop background location tracking:', error);
  }
}

/**
 * Retrieves the number of pending unsynced locations in storage.
 * Useful for debugging or showing sync status.
 */
export async function getPendingLocationCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Real-time driver location hook for UI updates.
 * Safely handles Location Accuracy popup cancellation ("No, thanks") without crashing.
 */
export function useDriverLocation(
  enabled: boolean,
  fallbackLocation?: { latitude: number; longitude: number } | null
) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    fallbackLocation ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const fallbackLat = fallbackLocation?.latitude;
  const fallbackLng = fallbackLocation?.longitude;

  useEffect(() => {
    if (!enabled) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    let active = true;

    (async () => {
      try {
        const hasLocation = await ensureLocationServicesEnabled();
        if (!hasLocation) {
          if (active) {
            setError('Location services disabled or permission denied.');
            if (fallbackLat != null && fallbackLng != null) {
              setLocation({ latitude: fallbackLat, longitude: fallbackLng });
            }
          }
          return;
        }

        try {
          const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (active) {
            setLocation((prev) => {
              if (
                prev?.latitude === initial.coords.latitude &&
                prev?.longitude === initial.coords.longitude
              ) {
                return prev;
              }
              return { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
            });
          }
        } catch (locError) {
          console.warn('Could not get initial position (location accuracy declined):', locError);
          if (active && fallbackLat != null && fallbackLng != null) {
            setLocation({ latitude: fallbackLat, longitude: fallbackLng });
          }
        }

        try {
          watchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
            (loc) => {
              if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
              if (active) {
                setLocation((prev) => {
                  if (
                    prev &&
                    prev.latitude === loc.coords.latitude &&
                    prev.longitude === loc.coords.longitude
                  ) {
                    return prev;
                  }
                  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                });
              }
            }
          );
        } catch (watchErr) {
          console.warn('Watch location failed (location accuracy declined):', watchErr);
          if (active) {
            setError('Location tracking unavailable. Check your device GPS settings.');
          }
        }
      } catch (error) {
        console.warn('Error in useDriverLocation:', error);
        if (active && fallbackLat != null && fallbackLng != null) {
          setLocation({ latitude: fallbackLat, longitude: fallbackLng });
        }
      }
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [enabled, fallbackLat, fallbackLng]);

  return { location, error };
}