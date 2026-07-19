export interface MapRegion {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  title?: string;
}

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapDirections {
  origin: MapPoint;
  destination: MapPoint;
  routeGeometry?: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MapWebviewProps {
  region: MapRegion;
  markers?: MapMarker[];
  directions?: MapDirections | null;
  userLocation?: MapPoint | null;
  onRouteStatusChange?: (isValid: boolean) => void;
}
