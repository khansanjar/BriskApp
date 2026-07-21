import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as Location from 'expo-location';

import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

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

  const currentLocation = driverLocation ?? rideDetails.driverLocation;
  const showRoute =
    rideStatus === 'EN_ROUTE_TO_PICKUP' || rideStatus === 'EN_ROUTE_TO_DESTINATION';
  const routeOrigin = showRoute ? currentLocation : null;
  const routeDestination =
    rideStatus === 'EN_ROUTE_TO_PICKUP' || rideStatus === 'ARRIVED_AT_PICKUP'
      ? rideDetails.pickupLocation
      : rideDetails.dropoffLocation;

  const initialMapRegion =
    rideStatus === 'EN_ROUTE_TO_DESTINATION' || rideStatus === 'COMPLETED'
      ? {
          latitude: rideDetails.dropoffLocation.latitude,
          longitude: rideDetails.dropoffLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }
      : {
          latitude: rideDetails.pickupLocation.latitude,
          longitude: rideDetails.pickupLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const renderPickupCard = () => (
    <>
      <View style={styles.compactTop}>
        <View style={[styles.compactIcon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="location" size={20} color={theme.brand} />
        </View>
        <View style={styles.compactRoute}>
          <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
            {rideDetails.pickupLocation.address}
          </Text>
        </View>
        <StatusBadge status={rideStatus === 'ARRIVED_AT_PICKUP' ? 'arrived' : 'heading_to_pickup'} />
      </View>

      {routeInfo && (
        <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>ETA</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {formatDuration(routeInfo.duration)} · {routeInfo.distance.toFixed(1)} km
            </Text>
          </View>
        </View>
      )}

      <Button
        title={rideStatus === 'ARRIVED_AT_PICKUP' ? 'Start Ride' : 'Mark as Arrived'}
        onPress={rideStatus === 'ARRIVED_AT_PICKUP' ? handleStartRide : handleMarkArrived}
        style={styles.primaryButton}
      />
    </>
  );

  const renderArrivedCard = () => (
    <>
      <View style={styles.compactTop}>
        <View style={[styles.compactIcon, { backgroundColor: theme.warningSoft }]}>
          <Ionicons name="checkmark-circle" size={20} color={theme.warning} />
        </View>
        <View style={styles.compactRoute}>
          <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
            {rideDetails.pickupLocation.address}
          </Text>
          <Text style={[styles.compactArrow, { color: theme.textSecondary }]}>You have arrived</Text>
        </View>
        <StatusBadge status="arrived" />
      </View>

      <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Customer</Text>
          <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>
            {rideDetails.customer.name}
          </Text>
          {rideDetails.customer.phone ? (
            <Text style={[styles.metaContact, { color: theme.brand }]} numberOfLines={1}>
              {rideDetails.customer.phone}
            </Text>
          ) : null}
          {rideDetails.customer.email ? (
            <Text style={[styles.metaContact, { color: theme.textSecondary }]} numberOfLines={1}>
              {rideDetails.customer.email}
            </Text>
          ) : null}
        </View>
      </View>

      <Button title="Start Ride" onPress={handleStartRide} style={styles.primaryButton} />
    </>
  );

  const renderDestinationCard = () => (
    <>
      <View style={styles.compactTop}>
        <View style={[styles.compactIcon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="flag" size={20} color={theme.brand} />
        </View>
        <View style={styles.compactRoute}>
          <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
            {rideDetails.dropoffLocation.address}
          </Text>
        </View>
        <StatusBadge status="in_progress" />
      </View>

      {routeInfo && (
        <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>ETA</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {formatDuration(routeInfo.duration)} · {routeInfo.distance.toFixed(1)} km
            </Text>
          </View>
        </View>
      )}

      <Button title="Complete Ride" onPress={handleCompleteRide} style={styles.primaryButton} />
    </>
  );

  const renderCompletedCard = () => (
    <View style={styles.compactTop}>
      <View style={[styles.compactIcon, { backgroundColor: theme.successSoft }]}>
        <Ionicons name="checkmark-circle" size={22} color={theme.success} />
      </View>
      <View style={styles.compactRoute}>
        <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
          {rideDetails.dropoffLocation.address}
        </Text>
        <Text style={[styles.compactArrow, { color: theme.textSecondary }]}>Ride Completed</Text>
      </View>
      <StatusBadge status="completed" />
    </View>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialMapRegion}
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

        {rideStatus === 'EN_ROUTE_TO_PICKUP' && console.log('[ActiveRide] Pickup point:', rideDetails.pickupLocation)}
        {(rideStatus === 'EN_ROUTE_TO_DESTINATION' || rideStatus === 'COMPLETED') && console.log('[ActiveRide] Dropoff point:', rideDetails.dropoffLocation)}

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
    bottom: BottomTabInset + Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  cardHeader: {
    gap: Spacing.one,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.two,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRoute: { flex: 1, gap: 1 },
  compactPoint: { fontSize: 13, fontWeight: 700 },
  compactArrow: { fontSize: 12, fontWeight: 700, marginVertical: 1 },
  compactMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flex: 1, gap: 1 },
  metaLabel: { fontSize: 10, fontWeight: 600, opacity: 0.85 },
  metaValue: { fontSize: 12, fontWeight: 600 },
  metaContact: { fontSize: 11, fontWeight: 500 },
  customerSection: {
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  customerInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '500',
  },
  customerEmail: {
    fontSize: 12,
    fontWeight: '500',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: Spacing.two,
  },
  primaryButton: {
    marginTop: Spacing.two,
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
