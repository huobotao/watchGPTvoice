import "./styles.css";

import { createElevationProvider, createMapProvider } from "./providers";
import { attachClickInput, clearWaypoints, undoLastWaypoint } from "./input/clickWaypoints";
import { parseGpxOrKml } from "./input/gpxKml";
import { resampleByDistance } from "./geo/resample";
import { computeStats } from "./geo/stats";
import { clearChart, initChart, renderChart } from "./ui/chartView";
import { renderStats } from "./ui/statsBar";
import { hoverIdx, route, stats, status, waypoints } from "./store";
import type { LngLat, RouteLine } from "./providers/types";

const SAMPLES = 500;

const region = "global";
const mapProvider = createMapProvider(region);
const elevationProvider = createElevationProvider(region);

const mapEl = document.getElementById("map") as HTMLElement;
const chartEl = document.getElementById("chart") as HTMLElement;
const statsEl = document.getElementById("stats") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;
const gpxInput = document.getElementById("gpx-input") as HTMLInputElement;
const computeBtn = document.getElementById("compute-btn") as HTMLButtonElement;
const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

let pendingRoute: RouteLine | null = null;

async function main(): Promise<void> {
  await mapProvider.init(mapEl);
  initChart(chartEl);
  attachClickInput(mapProvider);
  wireUi();
  wireSignals();
}

function wireUi(): void {
  gpxInput.addEventListener("change", async () => {
    const file = gpxInput.files?.[0];
    if (!file) return;
    try {
      setStatus(`解析 ${file.name}...`, "loading");
      const parsed = await parseGpxOrKml(file);
      pendingRoute = parsed;
      waypoints.set([]);
      mapProvider.clearRoute();
      mapProvider.setRoute(parsed.coords);
      mapProvider.fitToRoute(parsed.coords);
      setStatus(`已加载 ${parsed.coords.length} 个轨迹点，点击"查海拔"开始查询。`, "info");
    } catch (e) {
      setStatus(`解析失败：${(e as Error).message}`, "error");
    } finally {
      gpxInput.value = "";
    }
  });

  undoBtn.addEventListener("click", () => undoLastWaypoint());
  clearBtn.addEventListener("click", () => {
    clearWaypoints();
    pendingRoute = null;
    mapProvider.clearRoute();
    clearChart();
    renderStats(statsEl, null);
    route.set(null);
    stats.set(null);
    setStatus("已清空。点击地图添加路径点，或上传 GPX 文件。", "info");
  });

  computeBtn.addEventListener("click", async () => {
    const coords = currentRouteCoords();
    if (coords.length < 2) {
      setStatus("至少需要 2 个点才能查海拔。", "error");
      return;
    }
    await computeElevation(coords);
  });
}

function currentRouteCoords(): LngLat[] {
  const wps = waypoints.get();
  if (wps.length >= 2) return wps;
  if (pendingRoute) return pendingRoute.coords;
  return [];
}

async function computeElevation(coords: LngLat[]): Promise<void> {
  try {
    setStatus("重采样路线...", "loading");
    const sampled = resampleByDistance(coords, SAMPLES);
    setStatus(`查询海拔（${sampled.coords.length} 点）...`, "loading");
    const elevations = await elevationProvider.sample(sampled.coords);
    const withEle = { ...sampled, elevations };
    route.set(withEle);
    const s = computeStats(withEle);
    stats.set(s);
    setStatus(
      `完成：${s.totalLength.toFixed(2)} km，累计爬升 ${Math.round(s.ascent)} m，下降 ${Math.round(
        s.descent,
      )} m。`,
      "info",
    );
  } catch (e) {
    setStatus(`查询失败：${(e as Error).message}`, "error");
  }
}

function wireSignals(): void {
  waypoints.subscribe((wps) => {
    mapProvider.setWaypoints(wps);
    if (wps.length >= 2) {
      mapProvider.setRoute(wps);
      pendingRoute = null;
    } else {
      mapProvider.setRoute([]);
    }
  });

  route.subscribe((r) => {
    if (r) renderChart(r);
    else clearChart();
  });

  stats.subscribe((s) => renderStats(statsEl, s));

  hoverIdx.subscribe((idx) => {
    const r = route.get();
    if (idx == null || !r) {
      mapProvider.showHoverMarker(null);
      return;
    }
    const p = r.coords[idx];
    if (p) mapProvider.showHoverMarker(p);
  });

  status.subscribe(({ text, level }) => {
    statusEl.textContent = text;
    statusEl.className = `status${level === "info" ? "" : ` ${level}`}`;
  });
}

function setStatus(text: string, level: "info" | "loading" | "error"): void {
  status.set({ text, level });
}

main().catch((e) => {
  console.error(e);
  setStatus(`初始化失败：${(e as Error).message}`, "error");
});
