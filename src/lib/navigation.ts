// src/lib/navigation.ts
import { Linking, Platform } from 'react-native';
import type { DriverStatus } from './api';

export interface NavigationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Opens Google Maps navigation with the specified destination coordinates.
 * Handles fallback to browser if Google Maps app is not installed.
 * 
 * @param destination - The destination coordinates for navigation
 * @param mode - Navigation mode: 'd' for driving, 'w' for walking, 'b' for bicycling
 */
export async function openGoogleMapsNavigation(
  destination: NavigationCoordinates,
  mode: 'd' | 'w' | 'b' = 'd'
): Promise<boolean> {
  try {
    const { latitude, longitude, address } = destination;
    
    // Validate coordinates
    if (latitude === 0 || longitude === 0 || isNaN(latitude) || isNaN(longitude)) {
      console.warn('[Navigation] Invalid coordinates:', { latitude, longitude });
      return false;
    }

    // Google Maps URL scheme for different platforms
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=${mode}`,
      android: `google.navigation:q=${latitude},${longitude}&mode=${mode}`,
    });

    if (!url) {
      console.warn('[Navigation] Unsupported platform');
      return false;
    }

    // Try to open Google Maps app first
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      console.log('[Navigation] Opened Google Maps navigation:', url);
      return true;
    } else {
      // Fallback to browser-based Google Maps
      console.log('[Navigation] Google Maps app not available, using browser fallback');
      const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${mode === 'd' ? 'driving' : mode === 'w' ? 'walking' : 'bicycling'}`;
      
      await Linking.openURL(browserUrl);
      console.log('[Navigation] Opened Google Maps in browser:', browserUrl);
      return true;
    }
  } catch (error) {
    console.error('[Navigation] Failed to open Google Maps:', error);
    return false;
  }
}

/**
 * Opens Google Maps with a specific address search instead of coordinates.
 * Useful when coordinates are not available but address is known.
 * 
 * @param address - The address to search for
 * @param mode - Navigation mode: 'd' for driving, 'w' for walking, 'b' for bicycling
 */
export async function openGoogleMapsSearch(
  address: string,
  mode: 'd' | 'w' | 'b' = 'd'
): Promise<boolean> {
  try {
    if (!address || address.trim() === '') {
      console.warn('[Navigation] Empty address provided');
      return false;
    }

    const encodedAddress = encodeURIComponent(address.trim());
    const url = Platform.select({
      ios: `comgooglemaps://?q=${encodedAddress}&directionsmode=${mode}`,
      android: `google.navigation:q=${encodedAddress}&mode=${mode}`,
    });

    if (!url) {
      console.warn('[Navigation] Unsupported platform');
      return false;
    }

    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      console.log('[Navigation] Opened Google Maps search:', url);
      return true;
    } else {
      // Fallback to browser
      const browserUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      await Linking.openURL(browserUrl);
      console.log('[Navigation] Opened Google Maps search in browser:', browserUrl);
      return true;
    }
  } catch (error) {
    console.error('[Navigation] Failed to open Google Maps search:', error);
    return false;
  }
}

/**
 * Determines the navigation destination based on the current ride status.
 * - heading_to_pickup: Navigate to pickup location
 * - arrived: Navigate to pickup location (for reference)
 * - in_progress: Navigate to dropoff location
 * - other: No navigation
 */
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

/**
 * Opens navigation based on the current ride status.
 * Automatically determines the correct destination (pickup vs dropoff).
 * 
 * @param status - Current driver status
 * @param pickupCoords - Pickup location coordinates
 * @param dropoffCoords - Dropoff location coordinates
 * @returns Promise<boolean> - True if navigation was opened successfully
 */
export async function openNavigationForRide(
  status: DriverStatus,
  pickupCoords: NavigationCoordinates | null,
  dropoffCoords: NavigationCoordinates | null
): Promise<boolean> {
  const destination = getNavigationDestination(status, pickupCoords, dropoffCoords);
  
  if (!destination) {
    console.log('[Navigation] No navigation destination for status:', status);
    return false;
  }

  return openGoogleMapsNavigation(destination, 'd');
}

/**
 * Opens a generic map view (not navigation) to show a location.
 * Useful for showing pickup/dropoff points without starting navigation.
 */
export async function openMapLocation(
  destination: NavigationCoordinates
): Promise<boolean> {
  try {
    const { latitude, longitude } = destination;
    
    if (latitude === 0 || longitude === 0 || isNaN(latitude) || isNaN(longitude)) {
      console.warn('[Navigation] Invalid coordinates for map view');
      return false;
    }

    const url = Platform.select({
      ios: `comgooglemaps://?center=${latitude},${longitude}&zoom=15`,
      android: `geo:${latitude},${longitude}?z=15`,
    });

    if (!url) {
      console.warn('[Navigation] Unsupported platform');
      return false;
    }

    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      console.log('[Navigation] Opened map location:', url);
      return true;
    } else {
      // Fallback to browser
      const browserUrl = `https://www.google.com/maps/@${latitude},${longitude},15z`;
      await Linking.openURL(browserUrl);
      console.log('[Navigation] Opened map location in browser:', browserUrl);
      return true;
    }
  } catch (error) {
    console.error('[Navigation] Failed to open map location:', error);
    return false;
  }
}
