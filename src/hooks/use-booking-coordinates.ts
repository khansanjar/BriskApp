import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { getRegionBias } from './useLocationTracking';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BookingCoordinates {
  pickup: LatLng | null;
  dropoff: LatLng | null;
}

const geocodeCache = new Map<string, LatLng>();

function isValidCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    (lat !== 0 || lng !== 0)
  );
}

export function resolveBookingCoordinates(booking: {
  pickup_location: string;
  dropoff_location: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
}): BookingCoordinates {
  const pickup = isValidCoord(booking.pickup_latitude, booking.pickup_longitude)
    ? ({ latitude: booking.pickup_latitude!, longitude: booking.pickup_longitude! } as LatLng)
    : null;

  const dropoff = isValidCoord(booking.dropoff_latitude, booking.dropoff_longitude)
    ? ({ latitude: booking.dropoff_latitude!, longitude: booking.dropoff_longitude! } as LatLng)
    : null;

  return { pickup, dropoff };
}

export async function geocodeAddress(
  address: string,
  rideCoords?: { latitude: number; longitude: number } | null,
  driverOperatingRegion?: string | null
): Promise<LatLng | null> {
  try {
    // Get dynamic region bias with fallbacks
    const regionBias = await getRegionBias(rideCoords, driverOperatingRegion);
    const enhancedAddress = `${address}, ${regionBias}`;
    
    if (geocodeCache.has(enhancedAddress)) {
      return geocodeCache.get(enhancedAddress)!;
    }

    try {
      const results = await Location.geocodeAsync(enhancedAddress);
      if (results[0] && typeof results[0].latitude === 'number' && typeof results[0].longitude === 'number') {
        const coords = { latitude: results[0].latitude, longitude: results[0].longitude };
        geocodeCache.set(enhancedAddress, coords);
        return coords;
      }
    } catch (geocodeError) {
      console.error('Geocoding failed for address:', address, geocodeError);
    }
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
  }

  return null;
}

export function useBookingCoordinates(
  booking: {
    booking_id: number | string;
    pickup_location: string;
    dropoff_location: string;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    dropoff_latitude: number | null;
    dropoff_longitude: number | null;
  } | null | undefined,
  options?: {
    rideCoords?: { latitude: number; longitude: number } | null;
    driverOperatingRegion?: string | null;
  }
): BookingCoordinates {
  const [coords, setCoords] = useState<BookingCoordinates>({ pickup: null, dropoff: null });
  const bookingRef = useRef(booking);
  const optionsRef = useRef(options);

  // Always keep refs updated for async execution
  useEffect(() => {
    bookingRef.current = booking;
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!booking) {
      setCoords({ pickup: null, dropoff: null });
      return;
    }

    const resolved = resolveBookingCoordinates(booking);
    setCoords(resolved);

    const promises: Promise<void>[] = [];

    // Geocode missing pickup coordinates
    if (!resolved.pickup && booking.pickup_location) {
      promises.push(
        geocodeAddress(
          booking.pickup_location,
          optionsRef.current?.rideCoords,
          optionsRef.current?.driverOperatingRegion
        ).then((c) => {
          if (c && bookingRef.current?.booking_id === booking.booking_id) {
            setCoords((prev) => ({ ...prev, pickup: c }));
          }
        })
      );
    }

    // Geocode missing dropoff coordinates
    if (!resolved.dropoff && booking.dropoff_location) {
      promises.push(
        geocodeAddress(
          booking.dropoff_location,
          optionsRef.current?.rideCoords,
          optionsRef.current?.driverOperatingRegion
        ).then((c) => {
          if (c && bookingRef.current?.booking_id === booking.booking_id) {
            setCoords((prev) => ({ ...prev, dropoff: c }));
          }
        })
      );
    }

    if (promises.length > 0) {
      Promise.all(promises).catch((error) => {
        console.warn('[Geocoding Error]:', error);
      });
    }
  }, [booking?.booking_id]); // Triggered only when booking changes

  return coords;
}