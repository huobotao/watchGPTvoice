export type LngLat = [number, number];

export interface RouteLine {
  coords: LngLat[];
  source: "click" | "gpx" | "kml" | "route";
}

export interface SampledRoute {
  coords: LngLat[];
  distances: number[];
  totalLength: number;
}

export interface RouteWithElevation extends SampledRoute {
  elevations: number[];
}

export interface RouteStats {
  totalLength: number;
  ascent: number;
  descent: number;
  minElevation: number;
  maxElevation: number;
  averageGrade: number;
}

export interface MapProvider {
  init(container: HTMLElement): Promise<void> | void;
  destroy(): void;
  onClick(handler: (lngLat: LngLat) => void): void;
  setWaypoints(coords: LngLat[]): void;
  setRoute(coords: LngLat[]): void;
  clearRoute(): void;
  fitToRoute(coords: LngLat[]): void;
  showHoverMarker(lngLat: LngLat | null): void;
}

export interface ElevationProvider {
  sample(points: LngLat[]): Promise<number[]>;
}
