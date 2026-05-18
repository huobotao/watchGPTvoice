import type { RouteWithElevation, RouteStats } from "../providers/types";

const ASCENT_THRESHOLD = 1;

export function computeStats(route: RouteWithElevation): RouteStats {
  const { elevations, totalLength } = route;
  let ascent = 0;
  let descent = 0;
  let min = elevations[0];
  let max = elevations[0];

  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > ASCENT_THRESHOLD) ascent += delta;
    else if (delta < -ASCENT_THRESHOLD) descent += -delta;
    if (elevations[i] < min) min = elevations[i];
    if (elevations[i] > max) max = elevations[i];
  }

  const totalLengthMeters = totalLength * 1000;
  const averageGrade = totalLengthMeters > 0 ? (ascent / totalLengthMeters) * 100 : 0;

  return {
    totalLength,
    ascent,
    descent,
    minElevation: min,
    maxElevation: max,
    averageGrade,
  };
}
