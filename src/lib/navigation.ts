// src/lib/navigation.ts
import { Linking, Platform } from 'react-native';
import type { DriverStatus } from './api';

export interface NavigationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

export type NavigationResult =
  | { opened: 'google'; url: string }
  | { opened: 'apple'; url: string }
  | { opened: 'browser'; url: string }
  | { opened: 'none'; reason: 'invalid_coords' | 'no_destination' | 'unsupported_platform' | 'error'; message?: string };

function isValidNavigationCoords(coords: NavigationCoordinates): boolean {
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    !Number.isNaN(coords.latitude) &&
    !Number.isNaN(coords.longitude) &&
    coords.latitude !== 0 &&
    coords.longitude !== 0 &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  );
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch (error) {
    console.warn('[Navigation] Failed to open URL:', url, error);
  }
  return false;
}

export async function openGoogleMapsNavigation(
  destination: NavigationCoordinates,
  mode: 'd' | 'w' | 'b' = 'd'
): Promise<NavigationResult> {
  const { latitude, longitude } = destination;

  if (!isValidNavigationCoords(destination)) {
    return { opened: 'none', reason: 'invalid_coords', message: 'Coordinates are not ready yet.' };
  }

  const googleUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=${mode}`,
    android: `google.navigation:q=${latitude},${longitude}&mode=${mode}`,
  });

  if (!googleUrl) {
    return { opened: 'none', reason: 'unsupported_platform', message: 'Navigation is not supported on this platform.' };
  }

  if (await tryOpenUrl(googleUrl)) {
    return { opened: 'google', url: googleUrl };
  }

  if (Platform.OS === 'ios') {
    const appleUrl = `maps://?daddr=${latitude},${longitude}&dirflg=${mode === 'd' ? 'd' : mode === 'w' ? 'w' : 'r'}`;
    if (await tryOpenUrl(appleUrl)) {
      return { opened: 'apple', url: appleUrl };
    }
  }

  const travelMode = mode === 'd' ? 'driving' : mode === 'w' ? 'walking' : 'bicycling';
  const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${travelMode}`;
  if (await tryOpenUrl(browserUrl)) {
    return { opened: 'browser', url: browserUrl };
  }

  return { opened: 'none', reason: 'error', message: 'Unable to open any maps application.' };
}

export async function openGoogleMapsSearch(
  address: string,
  mode: 'd' | 'w' | 'b' = 'd'
): Promise<NavigationResult> {
  if (!address || address.trim() === '') {
    return { opened: 'none', reason: 'invalid_coords', message: 'Address is missing.' };
  }

  const encodedAddress = encodeURIComponent(address.trim());
  const googleUrl = Platform.select({
    ios: `comgooglemaps://?q=${encodedAddress}&directionsmode=${mode}`,
    android: `google.navigation:q=${encodedAddress}&mode=${mode}`,
  });

  if (!googleUrl) {
    return { opened: 'none', reason: 'unsupported_platform', message: 'Navigation is not supported on this platform.' };
  }

  if (await tryOpenUrl(googleUrl)) {
    return { opened: 'google', url: googleUrl };
  }

  if (Platform.OS === 'ios') {
    const appleUrl = `maps://?daddr=${encodedAddress}&dirflg=${mode === 'd' ? 'd' : mode === 'w' ? 'w' : 'r'}`;
    if (await tryOpenUrl(appleUrl)) {
      return { opened: 'apple', url: appleUrl };
    }
  }

  const travelMode = mode === 'd' ? 'driving' : mode === 'w' ? 'walking' : 'bicycling';
  const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=${travelMode}`;
  if (await tryOpenUrl(browserUrl)) {
    return { opened: 'browser', url: browserUrl };
  }

  return { opened: 'none', reason: 'error', message: 'Unable to open any maps application.' };
}

export function getNavigationDestination(
  status: DriverStatus,
  pickupCoords: NavigationCoordinates | null,
  dropoffCoords: NavigationCoordinates | null
): NavigationCoordinates | null {
  switch (status) {
    case 'heading_to_pickup':
    case 'arrived':
      return pickupCoords;
    case 'in_progress':
      return dropoffCoords;
    case 'assigned':
    case 'completed':
    case 'canceled':
    default:
      return null;
  }
}

export async function openNavigationForRide(
  status: DriverStatus,
  pickupCoords: NavigationCoordinates | null,
  dropoffCoords: NavigationCoordinates | null
): Promise<NavigationResult> {
  const destination = getNavigationDestination(status, pickupCoords, dropoffCoords);

  if (!destination) {
    return { opened: 'none', reason: 'no_destination', message: 'No navigation destination available for this ride status.' };
  }

  return openGoogleMapsNavigation(destination, 'd');
}

export async function openMapLocation(
  destination: NavigationCoordinates
): Promise<NavigationResult> {
  const { latitude, longitude } = destination;

  if (!isValidNavigationCoords(destination)) {
    return { opened: 'none', reason: 'invalid_coords', message: 'Coordinates are not ready yet.' };
  }

  const googleUrl = Platform.select({
    ios: `comgooglemaps://?center=${latitude},${longitude}&zoom=15`,
    android: `geo:${latitude},${longitude}?z=15`,
  });

  if (!googleUrl) {
    return { opened: 'none', reason: 'unsupported_platform', message: 'Map view is not supported on this platform.' };
  }

  if (await tryOpenUrl(googleUrl)) {
    return { opened: 'google', url: googleUrl };
  }

  if (Platform.OS === 'ios') {
    const appleUrl = `maps://?center=${latitude},${longitude}&zoom=15`;
    if (await tryOpenUrl(appleUrl)) {
      return { opened: 'apple', url: appleUrl };
    }
  }

  const browserUrl = `https://www.google.com/maps/@${latitude},${longitude},15z`;
  if (await tryOpenUrl(browserUrl)) {
    return { opened: 'browser', url: browserUrl };
  }

  return { opened: 'none', reason: 'error', message: 'Unable to open any maps application.' };
}
