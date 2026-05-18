import along from "@turf/along";
import length from "@turf/length";
import { lineString } from "@turf/helpers";
import type { LngLat, SampledRoute } from "../providers/types";

const DEFAULT_SAMPLES = 500;

export function resampleByDistance(
  coords: LngLat[],
  sampleCount: number = DEFAULT_SAMPLES,
): SampledRoute {
  if (coords.length < 2) {
    throw new Error("Route must contain at least two points to resample.");
  }

  const line = lineString(coords);
  const totalLengthKm = length(line, { units: "kilometers" });

  if (totalLengthKm === 0) {
    throw new Error("Route has zero length.");
  }

  const n = Math.max(2, Math.min(sampleCount, 1000));
  const sampledCoords: LngLat[] = [];
  const distances: number[] = [];

  for (let i = 0; i < n; i++) {
    const dist = (totalLengthKm * i) / (n - 1);
    const point = along(line, dist, { units: "kilometers" });
    const [lng, lat] = point.geometry.coordinates;
    sampledCoords.push([lng, lat]);
    distances.push(dist);
  }

  return {
    coords: sampledCoords,
    distances,
    totalLength: totalLengthKm,
  };
}
