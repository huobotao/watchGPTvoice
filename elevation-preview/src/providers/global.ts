import L, { type Map as LeafletMap, type Polyline, type LayerGroup, type Marker, type DivIcon } from "leaflet";
import type { LngLat, MapProvider } from "./types";

const DEFAULT_CENTER: [number, number] = [39.9042, 116.4074];
const DEFAULT_ZOOM = 6;

export class GlobalMapProvider implements MapProvider {
  private map: LeafletMap | null = null;
  private waypointLayer: LayerGroup | null = null;
  private routeLayer: Polyline | null = null;
  private hoverMarker: Marker | null = null;
  private hoverIcon: DivIcon;
  private clickHandlers: Array<(p: LngLat) => void> = [];

  constructor() {
    this.hoverIcon = L.divIcon({
      className: "hover-marker",
      iconSize: [12, 12],
    });
  }

  init(container: HTMLElement): void {
    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      worldCopyJump: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    this.waypointLayer = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      const lngLat: LngLat = [e.latlng.lng, e.latlng.lat];
      for (const fn of this.clickHandlers) fn(lngLat);
    });

    this.map = map;
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
  }

  onClick(handler: (p: LngLat) => void): void {
    this.clickHandlers.push(handler);
  }

  setWaypoints(coords: LngLat[]): void {
    if (!this.waypointLayer) return;
    this.waypointLayer.clearLayers();
    coords.forEach(([lng, lat], i) => {
      L.circleMarker([lat, lng], {
        radius: 5,
        color: "#fff",
        weight: 2,
        fillColor: i === 0 ? "#2e7d32" : i === coords.length - 1 ? "#c62828" : "#3a6ab0",
        fillOpacity: 1,
      }).addTo(this.waypointLayer!);
    });
  }

  setRoute(coords: LngLat[]): void {
    if (!this.map) return;
    if (this.routeLayer) {
      this.routeLayer.remove();
      this.routeLayer = null;
    }
    if (coords.length < 2) return;
    const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));
    this.routeLayer = L.polyline(latLngs, {
      color: "#3a9d40",
      weight: 4,
      opacity: 0.9,
    }).addTo(this.map);
  }

  clearRoute(): void {
    this.routeLayer?.remove();
    this.routeLayer = null;
    this.waypointLayer?.clearLayers();
    this.showHoverMarker(null);
  }

  fitToRoute(coords: LngLat[]): void {
    if (!this.map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords.map(([lng, lat]) => L.latLng(lat, lng)));
    this.map.fitBounds(bounds, { padding: [30, 30] });
  }

  showHoverMarker(lngLat: LngLat | null): void {
    if (!this.map) return;
    if (!lngLat) {
      this.hoverMarker?.remove();
      this.hoverMarker = null;
      return;
    }
    const ll = L.latLng(lngLat[1], lngLat[0]);
    if (this.hoverMarker) {
      this.hoverMarker.setLatLng(ll);
    } else {
      this.hoverMarker = L.marker(ll, { icon: this.hoverIcon, interactive: false }).addTo(this.map);
    }
  }
}
