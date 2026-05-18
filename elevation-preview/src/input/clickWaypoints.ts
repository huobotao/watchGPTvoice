import type { LngLat, MapProvider } from "../providers/types";
import { waypoints } from "../store";

export function attachClickInput(map: MapProvider): void {
  map.onClick((p: LngLat) => {
    const next = [...waypoints.get(), p];
    waypoints.set(next);
  });
}

export function undoLastWaypoint(): void {
  const list = waypoints.get();
  if (list.length === 0) return;
  waypoints.set(list.slice(0, -1));
}

export function clearWaypoints(): void {
  waypoints.set([]);
}
