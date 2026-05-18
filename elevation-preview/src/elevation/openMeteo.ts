import type { ElevationProvider, LngLat } from "../providers/types";

const ENDPOINT = "https://api.open-meteo.com/v1/elevation";
const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function queryBatch(points: LngLat[]): Promise<number[]> {
  const lat = points.map((p) => p[1].toFixed(5)).join(",");
  const lon = points.map((p) => p[0].toFixed(5)).join(",");
  const url = `${ENDPOINT}?latitude=${lat}&longitude=${lon}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo elevation request failed: ${res.status}`);
  }
  const data = (await res.json()) as { elevation: number[] };
  if (!Array.isArray(data.elevation) || data.elevation.length !== points.length) {
    throw new Error("Open-Meteo returned unexpected payload shape.");
  }
  return data.elevation;
}

export const openMeteoProvider: ElevationProvider = {
  async sample(points: LngLat[]): Promise<number[]> {
    const batches = chunk(points, BATCH_SIZE);
    const results = await Promise.all(batches.map(queryBatch));
    return results.flat();
  },
};
