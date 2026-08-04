// src/hooks/useLocationTracking.ts
import { postLocationBatch, type DriverStatus } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking } from 'react-native';

let TaskManager: typeof import('expo-task-manager') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManager = require('expo-task-manager');
} catch (error) {
  console.warn('[LocationTracking TaskManager Error]:', error);
  TaskManager = null;
}

const LOCATION_TASK_NAME = 'background-location-tracking';
const QUEUE_KEY = '@pending_location_queue';
const LOCATION_QUEUE_MAX = 500;
const UPLOAD_INTERVAL_MS = 25000; // 25 seconds throttle

// Cached region string from driver's current location
let cachedRegion: string | null = null;
let regionCacheTimestamp: number = 0;
const REGION_CACHE_DURATION = 5 * 60 * 1000;

// Background task state for throttling
let lastUploadTime: number = 0;
let currentBookingId: number | null = null;
let locationBuffer: QueuedLocation[] = [];

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

    console.log('[LocationTracking] Location queued for offline sync:', JSON.stringify(point));

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
      console.log('[LocationTracking] Sending location batch to backend:', JSON.stringify({ bookingId, count: toSend.length, locations: toSend }));
      const result = await postLocationBatch(bookingId, toSend);
      console.log('[LocationTracking] Location batch upload successful:', JSON.stringify(result));
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (err) {
      console.warn('[LocationTracking] Location batch upload failed:', err);
      // Keep locations in storage for retry on next flush cycle.
    }
  } catch (error) {
    console.warn('Error flushing location queue:', error);
  }
}

/**
 * Background task that receives location updates from the OS even when
 * the app is in the background or killed.
 * Directly uploads to API with 25-second throttling.
 * Falls back to AsyncStorage if network fails.
 */
TaskManager?.defineTask?.(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocationTask] Error:', error);
    return;
  }

  const locations =
    (data as { locations?: Location.LocationObject[] })?.locations;
  if (!locations || !Array.isArray(locations)) {
    return;
  }

  const now = Date.now();
  const shouldUpload = (now - lastUploadTime) >= UPLOAD_INTERVAL_MS;

  for (const loc of locations) {
    if (loc.coords.latitude === 0 && loc.coords.longitude === 0) continue;

    const point: QueuedLocation = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      timestamp: new Date(loc.timestamp).toISOString(),
      heading: loc.coords.heading ?? undefined,
      speed: loc.coords.speed ?? undefined,
    };

    console.log('[BackgroundLocationTask] Location received:', JSON.stringify(point));
    
    // Add to buffer
    locationBuffer.push(point);
  }

  // Throttled upload every 25 seconds
  if (shouldUpload && locationBuffer.length > 0 && currentBookingId != null) {
    lastUploadTime = now;
    
    try {
      // Check network connectivity
      const net = await NetInfo.fetch();
      
      if (net.isConnected) {
        // Direct API upload from background task
        console.log('[BackgroundLocationTask] Uploading batch:', JSON.stringify({ 
          bookingId: currentBookingId, 
          count: locationBuffer.length 
        }));
        
        await postLocationBatch(currentBookingId, [...locationBuffer]);
        console.log('[BackgroundLocationTask] Upload successful');
        
        // Clear buffer on success
        locationBuffer = [];
      } else {
        // Network unavailable - save to offline queue
        console.log('[BackgroundLocationTask] Network unavailable, saving to offline queue');
        for (const point of locationBuffer) {
          await saveLocationOffline(point);
        }
        locationBuffer = [];
      }
    } catch (uploadError) {
      console.warn('[BackgroundLocationTask] Upload failed, saving to offline queue:', uploadError);
      
      // Save failed locations to offline queue
      for (const point of locationBuffer) {
        await saveLocationOffline(point);
      }
      locationBuffer = [];
    }
  }
});

/**
 * Hook that manages persistent location tracking for an active ride.
 * Uses AsyncStorage-backed queue and expo-task-manager background updates.
 * Directly uploads to API from background task with 25-second throttling.
 * Automatically flushes offline queue when app returns to foreground.
 */
export function useLocationTracking(bookingId: number | null, status: DriverStatus | null) {
  const hasStartedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive =
    bookingId != null &&
    (status === 'heading_to_pickup' || status === 'in_progress' || status === 'arrived');

  // Helper 1: Clears existing state, resets tracking flags, and stops background service
  const stopTracking = async () => {
    hasStartedRef.current = false;
    setIsTracking(false);
    currentBookingId = null;
    locationBuffer = [];
    lastUploadTime = 0;
    await stopBackgroundLocationTracking();
  };

  // Helper 2: Centralized function to request permissions, start background task
  const startTracking = async (targetBookingId: number) => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    try {
      const hasLocation = await ensureLocationServicesEnabled();
      if (!hasLocation) {
        await stopTracking();
        return;
      }

      const taskManagerAvailable = TaskManager ? await TaskManager.isAvailableAsync() : false;
      if (!taskManagerAvailable) {
        console.warn('[LocationTracking] TaskManager not available — background tracking will not start');
      }

      // Set global booking ID for background task
      currentBookingId = targetBookingId;
      locationBuffer = [];
      lastUploadTime = 0;

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Location Tracking Active',
          notificationBody: 'Tracking driver location for active ride.',
        },
      });

      setIsTracking(true);
      setError(null);
    } catch (startErr) {
      console.warn('[LocationTracking] startLocationUpdatesAsync failed:', startErr);
      await stopTracking();
      setError('Location tracking unavailable. Check your device GPS settings.');
    }
  };

  // AppState listener: flush offline queue when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;

      // When app becomes active, flush any pending offline locations
      if (nextAppState === 'active' && bookingId != null) {
        console.log('[LocationTracking] App became active, flushing offline queue');
        await flushPendingLocations(bookingId);
        
        // If ride is active but tracking hasn't started yet, attempt start
        if (isActive && !hasStartedRef.current) {
          await startTracking(bookingId);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, bookingId]);

  // Main tracking effect: starts/stops background tracking based on ride state
  useEffect(() => {
    if (!isActive || bookingId == null) {
      stopTracking();
      return;
    }

    startTracking(bookingId);

    return () => {
      stopTracking();
    };
  }, [bookingId, status, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return { isTracking, error, openAppSettings };
}

/**
 * Stops background location updates for the current ride.
 * Call this when the ride is completed or cancelled.
 * Also clears global state variables.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    if (TaskManager) {
      // Check if task is registered before stopping to prevent TaskNotFoundException
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[LocationTracking] Background location updates stopped successfully.');
      }
    }
    
    // Clear global state
    currentBookingId = null;
    locationBuffer = [];
    lastUploadTime = 0;
  } catch (error) {
    console.warn('[LocationTracking] Failed to stop background location tracking:', error);
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
  } catch (error) {
    console.warn('[LocationTracking Queue Read Error]:', error);
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