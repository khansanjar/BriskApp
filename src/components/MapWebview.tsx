import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { colors, radii, spacing } from "@/constants/theme";
import { MapWebviewProps } from "@/types/type";

export default function MapWebview({
  region,
  markers = [],
  directions,
  userLocation,
  onRouteStatusChange,
}: MapWebviewProps) {
  const webViewRef = useRef<WebView>(null);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  const mapHtml = useMemo(() => {
    const userLocationStr = JSON.stringify(userLocation);
    const directionsStr = JSON.stringify(directions);
    const markersStr = JSON.stringify(markers);

    console.log("[MapsWebview] Generating map HTML with:", {
      region,
      hasDirections: !!directions,
      hasUserLocation: !!userLocation,
    });

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, user-scalable=yes" />
        <style>
          #map { height: 100vh; width: 100vw; }
          body { margin: 0; padding: 0; }
        </style>
        <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry"></script>
        <script>
          let map;
          let googleMarkers = {};
          let directionsRenderer;
          let directionsService;

          function initMap() {
            console.log('[MapsWebview] initMap called');
            map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: ${region.latitude}, lng: ${region.longitude} },
              zoom: 12,
              disableDefaultUI: false,
              gestureHandling: 'auto'
            });

            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });

            console.log('[MapsWebview] Initial userLocation:', ${userLocationStr});
            console.log('[MapsWebview] Initial directions:', ${directionsStr});
            
            updateMarkers(${markersStr});
            createUserMarker(${userLocationStr});
            if (${directionsStr}) {
              updateDirections(${directionsStr});
            }
          }

          // Trigger Map Updates from React Native
          function updateMapData(region, markers, directions, userLocation) {
            console.log('[MapsWebview] updateMapData called:', { region, hasDirections: !!directions, hasUserLocation: !!userLocation });
            if (!map) {
              console.log('[MapsWebview] Map not ready yet');
              return;
            }
            
            map.setCenter({ lat: region.latitude, lng: region.longitude });
            
            updateMarkers(markers);
            createUserMarker(userLocation);
            updateDirections(directions);
          }

          function updateMarkers(markers) {
            if (!map) return;
            Object.keys(googleMarkers).forEach((key) => {
              if (key.startsWith('marker-')) {
                googleMarkers[key].setMap(null);
                delete googleMarkers[key];
              }
            });

            if (!Array.isArray(markers)) return;

            markers.forEach((marker) => {
              const markerKey = 'marker-' + marker.id;
              googleMarkers[markerKey] = new google.maps.Marker({
                position: { lat: marker.latitude, lng: marker.longitude },
                map: map,
                title: marker.title || '',
              });
            });
          }

          // User Blue Pin Marker Logic
          function createUserMarker(userLocation) {
            console.log('[MapsWebview] createUserMarker called with:', userLocation);
            if (!map) return;
            if (!userLocation) {
              if (googleMarkers['user']) {
                googleMarkers['user'].setMap(null);
                delete googleMarkers['user'];
              }
              return;
            }

            const position = { lat: userLocation.latitude, lng: userLocation.longitude };
            if (googleMarkers['user']) {
              googleMarkers['user'].setPosition(position);
            } else {
              googleMarkers['user'] = new google.maps.Marker({
                position: position,
                map: map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                },
                title: 'Your location',
                zIndex: 1000,
              });
              console.log('[MapsWebview] Created user marker');
            }
          }

          // Destination & Polyline Routing Logic
          function updateDirections(dirData) {
            console.log('[MapsWebview] updateDirections called with:', JSON.stringify(dirData));
            if (!dirData || !dirData.origin || !dirData.destination || !map) {
              console.log('[MapsWebview] No valid directions data, clearing route');
              directionsRenderer.setDirections({ routes: [] });
              if (googleMarkers['destination']) {
                googleMarkers['destination'].setMap(null);
                delete googleMarkers['destination'];
              }
              if (window.routePolyline) {
                window.routePolyline.setMap(null);
                window.routePolyline = null;
              }
              return;
            }

            const destPosition = { lat: dirData.destination.latitude, lng: dirData.destination.longitude };
            if (googleMarkers['destination']) {
              googleMarkers['destination'].setPosition(destPosition);
            } else {
              googleMarkers['destination'] = new google.maps.Marker({
                position: destPosition,
                map: map,
                title: 'Destination',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#FF4444',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                },
                zIndex: 999,
              });
              console.log('[MapsWebview] Created destination marker at:', destPosition);
            }

            if (dirData.routeGeometry && dirData.routeGeometry.length > 0) {
              console.log('[MapsWebview] Drawing route from geometry, points:', dirData.routeGeometry.length);
              const path = dirData.routeGeometry.map(coord => ({ lat: coord[1], lng: coord[0] }));
              
              if (window.routePolyline) {
                window.routePolyline.setPath(path);
              } else {
                window.routePolyline = new google.maps.Polyline({
                  path: path,
                  map: map,
                  strokeColor: dirData.strokeColor || '#0286FF',
                  strokeWeight: dirData.strokeWidth || 4,
                });
              }
              const bounds = new google.maps.LatLngBounds();
              bounds.extend({ lat: dirData.origin.latitude, lng: dirData.origin.longitude });
              bounds.extend({ lat: dirData.destination.latitude, lng: dirData.destination.longitude });
              map.fitBounds(bounds, 60);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROUTE_STATUS', isValid: true }));
              return;
            }

            directionsRenderer.setOptions({
              polylineOptions: {
                strokeColor: dirData.strokeColor || '#0286FF',
                strokeWidth: dirData.strokeWidth || 4
              }
            });

            directionsService.route({
              origin: { lat: dirData.origin.latitude, lng: dirData.origin.longitude },
              destination: { lat: dirData.destination.latitude, lng: dirData.destination.longitude },
              travelMode: google.maps.TravelMode.DRIVING
            }, (response, status) => {
              console.log('[MapsWebview] Directions response status:', status);
              if (status === 'OK') {
                directionsRenderer.setDirections(response);
                const bounds = new google.maps.LatLngBounds();
                bounds.extend({ lat: dirData.origin.latitude, lng: dirData.origin.longitude });
                bounds.extend({ lat: dirData.destination.latitude, lng: dirData.destination.longitude });
                map.fitBounds(bounds, 60);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROUTE_STATUS', isValid: true }));
              } else {
                console.error('[MapsWebview] Directions failed with status:', status);
                directionsRenderer.setDirections({ routes: [] });
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROUTE_STATUS', isValid: false }));
              }
            });
          }

          // WebView Communication Listener
          window.addEventListener('message', (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('[MapsWebview] Received message from React Native:', message.type);
              if (message.type === 'UPDATE_MAP') {
                const { region, markers, directions, userLocation } = message.data;
                updateMapData(region, markers, directions, userLocation);
              }
            } catch (e) {
              console.error("[MapsWebview] Error processing webview message", e);
            }
          });

          window.onload = initMap;
        </script>
      </head>
      <body>
        <div id="map"></div>
      </body>
    </html>
    `;
  }, [region, markers, directions, userLocation, apiKey]);

  useEffect(() => {
    const payload = {
      type: "UPDATE_MAP",
      data: { region, markers, directions, userLocation },
    };
    console.log("[MapsWebview] Sending UPDATE_MAP to WebView");
    webViewRef.current?.postMessage(JSON.stringify(payload));
  }, [region, markers, directions, userLocation]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log("[MapsWebview] Received message from WebView:", message);
      if (message.type === "ROUTE_STATUS") {
        onRouteStatusChange?.(message.isValid);
      }
    } catch (error) {
      console.error("Error processing native webview message", error);
    }
  };

  if (!apiKey) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.stateTitle}>Google Maps key missing</Text>
        <Text style={styles.stateText}>Add EXPO_PUBLIC_GOOGLE_API_KEY to .env and restart Expo.</Text>
      </View>
    );
  }

  return (
    <WebView
      style={styles.webview}
      ref={webViewRef}
      originWhitelist={["*"]}
      source={{ html: mapHtml }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      onMessage={handleMessage}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  statePanel: {
    flex: 1,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
