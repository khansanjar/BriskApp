// src/components/ActiveRideScreen.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Booking, type DriverStatus } from '@/lib/api';

export interface ActiveRideScreenProps {
  booking: Booking;
  pickupCoords?: { latitude: number; longitude: number } | null;
  dropoffCoords?: { latitude: number; longitude: number } | null;
  onStatusChange: (status: DriverStatus) => Promise<void>;
  onRideComplete?: () => void;
}

export function ActiveRideScreen({
  booking,
  pickupCoords,
  dropoffCoords,
  onStatusChange,
  onRideComplete,
}: ActiveRideScreenProps) {
  const theme = useTheme();
  
  // 1. Local status state for Instant / Smooth UI transition
  const [currentStatus, setCurrentStatus] = useState<DriverStatus>(booking.driver_status);
  const [isArriving, setIsArriving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const hasFittedMapRef = useRef<string | null>(null);
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  const b = booking as Record<string, any>;

  // Sync with prop if parent updates from outside
  useEffect(() => {
    setCurrentStatus(booking.driver_status);
  }, [booking.driver_status]);

  // Memoize locations
  const pickupLocation = useMemo(() => ({
    latitude: pickupCoords?.latitude ?? Number(b.pickup_latitude ?? 0),
    longitude: pickupCoords?.longitude ?? Number(b.pickup_longitude ?? 0),
    address: (b.pickup_address as string) || (b.pickup?.address as string) || 'Pickup Location',
  }), [pickupCoords, b.pickup_latitude, b.pickup_longitude, b.pickup_address, b.pickup]);

  const dropoffLocation = useMemo(() => ({
    latitude: dropoffCoords?.latitude ?? Number(b.dropoff_latitude ?? 0),
    longitude: dropoffCoords?.longitude ?? Number(b.dropoff_longitude ?? 0),
    address: (b.dropoff_address as string) || (b.dropoff?.address as string) || 'Dropoff Location',
  }), [dropoffCoords, b.dropoff_latitude, b.dropoff_longitude, b.dropoff_address, b.dropoff]);

  const customerName = (b.customer_name as string) || (b.customer?.name as string) || 'Passenger';
  const customerPhone = (b.customer_phone as string) || (b.customer?.phone as string) || null;
  const customerEmail = (b.customer_email as string) || (b.customer?.email as string) || null;

   // Track Driver GPS Location
   useEffect(() => {
     let active = true;

     (async () => {
       try {
         const { status } = await Location.requestForegroundPermissionsAsync();
         if (status !== 'granted') {
           if (active) {
             setLocationError('Location permission denied.');
             setDriverLocation(pickupLocation);
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
          } catch (error) {
            console.warn('[ActiveRideScreen Location Error]:', error);
            if (active) {
              setDriverLocation(pickupLocation);
            }
         }

         try {
           watchRef.current = await Location.watchPositionAsync(
             { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
             (loc) => {
               if (loc.coords.latitude === 0 && loc.coords.longitude === 0) return;
               setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
             }
           );
         } catch (watchErr) {
           console.warn('watchPositionAsync failed (location settings unsatisfied):', watchErr);
           if (active) {
             setLocationError('Location tracking unavailable. Check your device GPS settings.');
           }
         }
       } catch (permErr) {
         console.warn('requestForegroundPermissionsAsync failed (location settings unsatisfied):', permErr);
         if (active) {
           setLocationError('Location access unavailable. Check your device GPS settings.');
           setDriverLocation(pickupLocation);
         }
       }
     })();

     return () => {
       active = false;
       watchRef.current?.remove();
       watchRef.current = null;
     };
   }, [booking.booking_id, pickupLocation]);

  const fitMapToRoute = useCallback(
    (coords: { latitude: number; longitude: number }[]) => {
      if (!mapRef.current || coords.length < 2) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    },
    []
  );

  // Smooth camera refocus when status changes
  useEffect(() => {
    if (!driverLocation) return;

    if (hasFittedMapRef.current !== currentStatus) {
      if (currentStatus === 'heading_to_pickup' || currentStatus === 'arrived') {
        fitMapToRoute([driverLocation, pickupLocation]);
      } else if (currentStatus === 'in_progress') {
        fitMapToRoute([driverLocation, dropoffLocation]);
      } else if (currentStatus === 'completed') {
        mapRef.current?.fitToCoordinates([dropoffLocation], {
          edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
          animated: true,
        });
      }
      hasFittedMapRef.current = currentStatus;
    }
  }, [currentStatus, driverLocation, pickupLocation, dropoffLocation, fitMapToRoute]);

  // 2. Optimistic Status Handler
  const handleStatusTransition = useCallback(async (nextStatus: DriverStatus) => {
    if (nextStatus === 'arrived') setIsArriving(true);
    else if (nextStatus === 'in_progress') setIsStarting(true);
    else if (nextStatus === 'completed') setIsCompleting(true);

    setRouteInfo(null);

    setCurrentStatus(nextStatus);
    hasFittedMapRef.current = null;

    try {
      await onStatusChange(nextStatus);
      if (nextStatus === 'completed') {
        onRideComplete?.();
      }
    } catch (error) {
      setCurrentStatus(booking.driver_status);
      console.error('Failed to change ride status:', error);
    } finally {
      setIsArriving(false);
      setIsStarting(false);
      setIsCompleting(false);
    }
  }, [onStatusChange, onRideComplete, booking.driver_status]);

  // 3. Confirmation Dialog Handler
  const confirmAndTransition = (nextStatus: DriverStatus) => {
    let title = '';
    let message = '';

    switch (nextStatus) {
      case 'heading_to_pickup':
        title = 'Heading to Pickup?';
        message = 'Are you sure you want to start heading towards the pickup location?';
        break;
      case 'arrived':
        title = 'Confirm Arrival?';
        message = 'Are you sure you have arrived at the pickup location?';
        break;
      case 'in_progress':
        title = 'Start Ride?';
        message = 'Has the passenger boarded? Confirm to start the trip.';
        break;
      case 'completed':
        title = 'Complete Ride?';
        message = 'Are you sure you want to mark this ride as completed?';
        break;
      default:
        handleStatusTransition(nextStatus);
        return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          style: 'default',
          onPress: () => handleStatusTransition(nextStatus),
        },
      ],
      { cancelable: true }
    );
  };

  const currentLocation = driverLocation ?? pickupLocation;
  const showRoute = currentStatus === 'heading_to_pickup' || currentStatus === 'in_progress';
  const routeOrigin = showRoute ? currentLocation : null;
  const routeDestination =
    currentStatus === 'heading_to_pickup' || currentStatus === 'arrived'
      ? pickupLocation
      : dropoffLocation;

  const initialMapRegion = useMemo(() => {
    return currentStatus === 'in_progress' || currentStatus === 'completed'
      ? {
          latitude: dropoffLocation.latitude,
          longitude: dropoffLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }
      : {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
  }, [currentStatus, pickupLocation, dropoffLocation]);

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
            {pickupLocation.address}
          </Text>
        </View>
        <StatusBadge status={currentStatus} />
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
        title={isArriving ? "Arriving..." : "Mark as Arrived"}
        loading={isArriving}
        disabled={isArriving}
        onPress={() => confirmAndTransition('arrived')}
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
            {pickupLocation.address}
          </Text>
          <Text style={[styles.compactArrow, { color: theme.textSecondary }]}>You have arrived</Text>
        </View>
        <StatusBadge status="arrived" />
      </View>

      <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Customer</Text>
          <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>
            {customerName}
          </Text>
          {customerPhone ? (
            <Text style={[styles.metaContact, { color: theme.brand }]} numberOfLines={1}>
              {customerPhone}
            </Text>
          ) : null}
          {customerEmail ? (
            <Text style={[styles.metaContact, { color: theme.textSecondary }]} numberOfLines={1}>
              {customerEmail}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        title={isStarting ? "Starting Ride..." : "Start Ride"}
        loading={isStarting}
        disabled={isStarting}
        onPress={() => confirmAndTransition('in_progress')}
        style={styles.primaryButton}
      />
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
            {dropoffLocation.address}
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

      <Button
        title={isCompleting ? "Completing Ride..." : "Complete Ride"}
        loading={isCompleting}
        disabled={isCompleting}
        onPress={() => confirmAndTransition('completed')}
        style={styles.primaryButton}
/>
     </>
  );

  const renderCompletedCard = () => (
    <View style={styles.compactTop}>
      <View style={[styles.compactIcon, { backgroundColor: theme.successSoft }]}>
        <Ionicons name="checkmark-circle" size={22} color={theme.success} />
      </View>
      <View style={styles.compactRoute}>
        <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
          {dropoffLocation.address}
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

        {(currentStatus === 'heading_to_pickup' || currentStatus === 'arrived') && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup"
            description={pickupLocation.address}
            identifier="pickup"
          >
            <View style={styles.endpointMarker}>
              <Ionicons name="location" size={28} color={theme.danger} />
            </View>
          </Marker>
        )}

        {(currentStatus === 'in_progress' || currentStatus === 'completed') && (
          <Marker
            coordinate={dropoffLocation}
            title="Dropoff"
            description={dropoffLocation.address}
            identifier="dropoff"
          >
            <View style={styles.endpointMarker}>
              <Ionicons name="flag" size={28} color={theme.brand} />
            </View>
          </Marker>
        )}

        {showRoute && routeOrigin && googleApiKey && (
          <MapViewDirections
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

      <View style={[styles.bottomCard, { backgroundColor: theme.surface }]} pointerEvents="box-none">
        {currentStatus === 'heading_to_pickup' && renderPickupCard()}
        {currentStatus === 'arrived' && renderArrivedCard()}
        {currentStatus === 'in_progress' && renderDestinationCard()}
        {currentStatus === 'completed' && renderCompletedCard()}
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
    bottom: BottomTabInset + Spacing.three,
    left: 0,
    right: 0,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
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
  compactPoint: { fontSize: 13, fontWeight: '700' },
  compactArrow: { fontSize: 12, fontWeight: '700', marginVertical: 1 },
  compactMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flex: 1, gap: 1 },
  metaLabel: { fontSize: 10, fontWeight: '600', opacity: 0.85 },
  metaValue: { fontSize: 12, fontWeight: '600' },
  metaContact: { fontSize: 11, fontWeight: '500' },
  primaryButton: {
    marginTop: Spacing.two,
  },
});