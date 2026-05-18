import type { ElevationProvider, MapProvider } from "./types";
import { GlobalMapProvider } from "./global";
import { openMeteoProvider } from "../elevation/openMeteo";

export type Region = "global" | "cn";

export function createMapProvider(region: Region): MapProvider {
  if (region === "cn") {
    throw new Error("CN provider not implemented yet (Phase 2).");
  }
  return new GlobalMapProvider();
}

export function createElevationProvider(_region: Region): ElevationProvider {
  return openMeteoProvider;
}
