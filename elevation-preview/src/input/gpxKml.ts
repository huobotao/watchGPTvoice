import { gpx, kml } from "@tmcw/togeojson";
import type { Feature, FeatureCollection, LineString, MultiLineString, Position } from "geojson";
import type { LngLat, RouteLine } from "../providers/types";

function extractCoords(fc: FeatureCollection): LngLat[] {
  const segments: Position[][] = [];
  for (const feature of fc.features as Feature[]) {
    const g = feature.geometry;
    if (!g) continue;
    if (g.type === "LineString") {
      segments.push((g as LineString).coordinates);
    } else if (g.type === "MultiLineString") {
      for (const seg of (g as MultiLineString).coordinates) segments.push(seg);
    }
  }
  const merged: LngLat[] = [];
  for (const seg of segments) {
    for (const p of seg) {
      merged.push([p[0], p[1]]);
    }
  }
  return dedupe(merged);
}

function dedupe(coords: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (const c of coords) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== c[0] || prev[1] !== c[1]) out.push(c);
  }
  return out;
}

export async function parseGpxOrKml(file: File): Promise<RouteLine> {
  const text = await file.text();
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const isKml = /\.kml$/i.test(file.name) || xml.documentElement.tagName.toLowerCase() === "kml";
  const fc = isKml ? kml(xml) : gpx(xml);
  const coords = extractCoords(fc as FeatureCollection);
  if (coords.length < 2) {
    throw new Error("文件中没有找到有效的轨迹（至少需要 2 个点）。");
  }
  return { coords, source: isKml ? "kml" : "gpx" };
}
