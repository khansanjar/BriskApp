import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as Location from 'expo-location';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export type RideStatus = 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'EN_ROUTE_TO_DESTINATION' | 'COMPLETED';

export interface RideDetails {
  driverLocation: { latitude: number; longitude: number };
  pickupLocation: { latitude: number; longitude: number; address: string };
  dropoffLocation: { latitude: number; longitude: number; address: string };
  customer: { name: string; phone: string; email: string; avatar: string | null };
}

interface ActiveRideScreenProps {
  rideDetails: RideDetails;
  initialStatus?: RideStatus;
  onMarkArrived?: () => void;
  onStartRide?: () => void;
  onCompleteRide?: () => void;
}

const DEFAULT_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export function ActiveRideScreen({
  rideDetails,
  initialStatus = 'EN_ROUTE_TO_PICKUP',
  onMarkArrived,
  onStartRide,
  onCompleteRide,
}: ActiveRideScreenProps) {
  const theme = useTheme();
  const [rideStatus, setRideStatus] = useState<RideStatus>(initialStatus);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (active) {
          setLocationError('Location permission denied.');
          setDriverLocation(rideDetails.driverLocation);
        }
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (active) {
          setDriverLocation({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }
      } catch {
        if (active) {
          setDriverLocation(rideDetails.driverLocation);
        }
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
          setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        },
      );
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [rideDetails.driverLocation]);

  const fitMapToRoute = useCallback(
    (coords: { latitude: number; longitude: number }[]) => {
      if (!mapRef.current || coords.length < 2) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    },
    [],
  );

  useEffect(() => {
    if (!driverLocation) return;

    if (rideStatus === 'EN_ROUTE_TO_PICKUP') {
      fitMapToRoute([driverLocation, rideDetails.pickupLocation]);
    } else if (rideStatus === 'ARRIVED_AT_PICKUP') {
      fitMapToRoute([driverLocation, rideDetails.pickupLocation]);
    } else if (rideStatus === 'EN_ROUTE_TO_DESTINATION') {
      fitMapToRoute([driverLocation, rideDetails.dropoffLocation]);
    } else if (rideStatus === 'COMPLETED') {
      mapRef.current?.fitToCoordinates([rideDetails.dropoffLocation], {
        edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    }
  }, [rideStatus, driverLocation, rideDetails.pickupLocation, rideDetails.dropoffLocation, fitMapToRoute]);

  const handleMarkArrived = useCallback(() => {
    setRideStatus('ARRIVED_AT_PICKUP');
    setRouteInfo(null);
    onMarkArrived?.();
  }, [onMarkArrived]);

  const handleStartRide = useCallback(() => {
    setRideStatus('EN_ROUTE_TO_DESTINATION');
    setRouteInfo(null);
    onStartRide?.();
  }, [onStartRide]);

  const handleCompleteRide = useCallback(() => {
    setRideStatus('COMPLETED');
    setRouteInfo(null);
    onCompleteRide?.();
  }, [onCompleteRide]);

  const handleCall = useCallback(() => {
    Linking.openURL(`tel:${rideDetails.customer.phone}`).catch(() => {
      Alert.alert('Unable to call', 'Please check your phone app settings.');
    });
  }, [rideDetails.customer.phone]);

  const currentLocation = driverLocation ?? rideDetails.driverLocation;
  const showRoute =
    rideStatus === 'EN_ROUTE_TO_PICKUP' || rideStatus === 'EN_ROUTE_TO_DESTINATION';
  const routeOrigin = showRoute ? currentLocation : null;
  const routeDestination =
    rideStatus === 'EN_ROUTE_TO_PICKUP' || rideStatus === 'ARRIVED_AT_PICKUP'
      ? rideDetails.pickupLocation
      : rideDetails.dropoffLocation;

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const renderPickupCard = () => (
    <>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Pickup Location</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          {rideDetails.pickupLocation.address}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.customerSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Customer</Text>
        <View style={styles.customerRow}>
          <Avatar
            firstName={rideDetails.customer.name.split(' ')[0]}
            lastName={rideDetails.customer.name.split(' ').slice(1).join(' ') || undefined}
            photo={rideDetails.customer.avatar ?? undefined}
            size={44}
            fallback="icon"
          />
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: theme.text }]}>
              {rideDetails.customer.name}
            </Text>
            <Pressable onPress={handleCall} style={styles.callRow}>
              <Ionicons name="call" size={16} color={theme.brand} />
              <Text style={[styles.phoneText, { color: theme.brand }]}>
                {rideDetails.customer.phone}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.customerEmail, { color: theme.textSecondary }]}>
          {rideDetails.customer.email}
        </Text>
      </View>

      {routeInfo && (
        <View style={styles.etaRow}>
          <Ionicons name="time" size={16} color={theme.textSecondary} />
          <Text style={[styles.etaText, { color: theme.textSecondary }]}>
            {formatDuration(routeInfo.duration)} to pickup
          </Text>
        </View>
      )}

      <Button title="Mark as Arrived" onPress={handleMarkArrived} style={styles.primaryButton} />
    </>
  );

  const renderArrivedCard = () => (
    <>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: theme.warning }]} />
        <Text style={[styles.statusText, { color: theme.warning }]}>Driver Arrived</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.customerSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Customer</Text>
        <View style={styles.customerRow}>
          <Avatar
            firstName={rideDetails.customer.name.split(' ')[0]}
            lastName={rideDetails.customer.name.split(' ').slice(1).join(' ') || undefined}
            photo={rideDetails.customer.avatar ?? undefined}
            size={44}
            fallback="icon"
          />
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: theme.text }]}>
              {rideDetails.customer.name}
            </Text>
            <Pressable onPress={handleCall} style={styles.callRow}>
              <Ionicons name="call" size={16} color={theme.brand} />
              <Text style={[styles.phoneText, { color: theme.brand }]}>
                {rideDetails.customer.phone}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.customerEmail, { color: theme.textSecondary }]}>
          {rideDetails.customer.email}
        </Text>
      </View>

      <Button title="Start Ride" onPress={handleStartRide} style={styles.primaryButton} />
    </>
  );

  const renderDestinationCard = () => (
    <>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Destination</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          {rideDetails.dropoffLocation.address}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.customerRow}>
        <Avatar
          firstName={rideDetails.customer.name.split(' ')[0]}
          lastName={rideDetails.customer.name.split(' ').slice(1).join(' ') || undefined}
          photo={rideDetails.customer.avatar ?? undefined}
          size={44}
          fallback="icon"
        />
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, { color: theme.text }]}>
            {rideDetails.customer.name}
          </Text>
          <Pressable onPress={handleCall} style={styles.callRow}>
            <Ionicons name="call" size={16} color={theme.brand} />
            <Text style={[styles.phoneText, { color: theme.brand }]}>
              {rideDetails.customer.phone}
            </Text>
          </Pressable>
        </View>
      </View>

      {routeInfo && (
        <View style={styles.etaRow}>
          <Ionicons name="time" size={16} color={theme.textSecondary} />
          <Text style={[styles.etaText, { color: theme.textSecondary }]}>
            {formatDuration(routeInfo.duration)} to destination
          </Text>
          <Text style={[styles.distanceText, { color: theme.textSecondary }]}>
            {routeInfo.distance.toFixed(1)} km
          </Text>
        </View>
      )}

      <Button title="Complete Ride" onPress={handleCompleteRide} style={styles.primaryButton} />
    </>
  );

  const renderCompletedCard = () => (
    <View style={styles.completedContainer}>
      <Ionicons name="checkmark-circle" size={48} color={theme.success} />
      <Text style={[styles.completedTitle, { color: theme.text }]}>Ride Completed</Text>
      <Text style={[styles.completedSubtitle, { color: theme.textSecondary }]}>
        You have reached {rideDetails.dropoffLocation.address}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={currentLocation}
          title="Your location"
          description="Current position"
          identifier="driver"
        >
          <View style={styles.driverMarkerContainer}>
            <View style={[styles.driverMarkerDot, { backgroundColor: theme.brand }]} />
          </View>
        </Marker>

        {(rideStatus === 'EN_ROUTE_TO_PICKUP' || rideStatus === 'ARRIVED_AT_PICKUP') && (
          <Marker
            coordinate={rideDetails.pickupLocation}
            title="Pickup"
            description={rideDetails.pickupLocation.address}
            identifier="pickup"
          >
            <View style={styles.endpointMarker}>
              <Ionicons name="location" size={28} color={theme.danger} />
            </View>
          </Marker>
        )}

        {(rideStatus === 'EN_ROUTE_TO_DESTINATION' || rideStatus === 'COMPLETED') && (
          <Marker
            coordinate={rideDetails.dropoffLocation}
            title="Dropoff"
            description={rideDetails.dropoffLocation.address}
            identifier="dropoff"
          >
            <View style={styles.endpointMarker}>
              <Ionicons name="flag" size={28} color={theme.brand} />
            </View>
          </Marker>
        )}

        {showRoute && routeOrigin && googleApiKey && (
          <MapViewDirections
            key={rideStatus}
            origin={routeOrigin}
            destination={routeDestination}
            apikey={googleApiKey}
            strokeWidth={5}
            strokeColor={theme.brand}
            mode="DRIVING"
            resetOnChange={false}
            onReady={(result) => {
              if (result) {
                setRouteInfo({
                  distance: result.distance,
                  duration: result.duration,
                });
                fitMapToRoute([routeOrigin, routeDestination]);
              }
            }}
            onError={(error) => console.warn('Directions error:', error)}
          />
        )}
      </MapView>

      {locationError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <Text style={[styles.errorBannerText, { color: theme.danger }]}>{locationError}</Text>
        </View>
      )}

      <View style={[styles.bottomCard, { backgroundColor: theme.surface }]}>
        {rideStatus === 'EN_ROUTE_TO_PICKUP' && renderPickupCard()}
        {rideStatus === 'ARRIVED_AT_PICKUP' && renderArrivedCard()}
        {rideStatus === 'EN_ROUTE_TO_DESTINATION' && renderDestinationCard()}
        {rideStatus === 'COMPLETED' && renderCompletedCard()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  driverMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  endpointMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Platform.select({ ios: Spacing.five, android: Spacing.six }),
    shadowColor: '#3D3796',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(61, 55, 150, 0.08)',
  },
  cardHeader: {
    gap: Spacing.one,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  customerSection: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  customerInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customerEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: Spacing.two,
  },
  primaryButton: {
    marginTop: Spacing.three,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  completedContainer: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  completedSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
