import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BookingCoordinates {
  pickup: LatLng | null;
  dropoff: LatLng | null;
}

const GEOCODE_REGION_BIAS = 'Islamabad, Pakistan';

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
    ? { latitude: booking.pickup_latitude, longitude: booking.pickup_longitude } as LatLng
    : null;

  const dropoff = isValidCoord(booking.dropoff_latitude, booking.dropoff_longitude)
    ? { latitude: booking.dropoff_latitude, longitude: booking.dropoff_longitude } as LatLng
    : null;

  return { pickup, dropoff };
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const enhancedAddress = `${address}, ${GEOCODE_REGION_BIAS}`;
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
  } catch {
    /* geocoding failed */
  }

  return null;
}

export function useBookingCoordinates(booking: {
  booking_id: number | string;
  pickup_location: string;
  dropoff_location: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
} | null | undefined): BookingCoordinates {
  const [coords, setCoords] = useState<BookingCoordinates>({ pickup: null, dropoff: null });
  const bookingRef = useRef(booking);

  useEffect(() => {
    bookingRef.current = booking;
  });

  useEffect(() => {
    if (!booking) {
      setCoords({ pickup: null, dropoff: null });
      return;
    }

    const resolved = resolveBookingCoordinates(booking);
    setCoords(resolved);

    const promises: Promise<void>[] = [];

    if (!resolved.pickup && booking.pickup_location) {
      promises.push(
        geocodeAddress(booking.pickup_location).then((c) => {
          if (c && bookingRef.current?.booking_id === booking.booking_id) {
            setCoords((prev) => ({ ...prev, pickup: c }));
          }
        })
      );
    }

    if (!resolved.dropoff && booking.dropoff_location) {
      promises.push(
        geocodeAddress(booking.dropoff_location).then((c) => {
          if (c && bookingRef.current?.booking_id === booking.booking_id) {
            setCoords((prev) => ({ ...prev, dropoff: c }));
          }
        })
      );
    }

    if (promises.length > 0) {
      Promise.all(promises).catch(() => {
        /* geocoding failures are silent; UI falls back to address text */
      });
    }
  }, [booking?.booking_id]);

  return coords;
}
