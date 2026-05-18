import * as echarts from "echarts";
import type { RouteWithElevation } from "../providers/types";
import { hoverIdx } from "../store";

let chart: echarts.ECharts | null = null;

export function initChart(container: HTMLElement): void {
  chart = echarts.init(container, "dark");
  window.addEventListener("resize", () => chart?.resize());

  chart.on("updateAxisPointer", (params: unknown) => {
    const evt = params as { axesInfo?: Array<{ value: number }> };
    const info = evt.axesInfo?.[0];
    if (info && typeof info.value === "number") {
      const opt = chart!.getOption() as { series?: Array<{ data: number[] }> };
      const data = opt.series?.[0]?.data ?? [];
      const idx = Math.min(Math.max(Math.round(info.value), 0), data.length - 1);
      hoverIdx.set(idx);
    }
  });

  container.addEventListener("mouseleave", () => hoverIdx.set(null));
}

export function renderChart(route: RouteWithElevation): void {
  if (!chart) return;
  const data = route.elevations.map((e, i) => [i, Math.round(e * 10) / 10]);

  chart.setOption(
    {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const arr = params as Array<{ data: [number, number] }>;
          const p = arr[0];
          if (!p) return "";
          const idx = p.data[0];
          const ele = p.data[1];
          const distKm = route.distances[idx] ?? 0;
          return `距离 ${distKm.toFixed(2)} km<br/>海拔 ${ele.toFixed(1)} m`;
        },
      },
      grid: { left: 50, right: 18, top: 18, bottom: 32 },
      xAxis: {
        type: "value",
        min: 0,
        max: data.length - 1,
        axisLabel: {
          formatter: (val: number) => {
            const km = route.distances[Math.round(val)] ?? 0;
            return `${km.toFixed(1)}`;
          },
        },
        name: "km",
        nameTextStyle: { color: "#8a93a6" },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "m",
        nameTextStyle: { color: "#8a93a6" },
      },
      series: [
        {
          type: "line",
          showSymbol: false,
          smooth: true,
          data,
          lineStyle: { color: "#3a9d40", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(58, 157, 64, 0.55)" },
              { offset: 1, color: "rgba(58, 157, 64, 0.02)" },
            ]),
          },
        },
      ],
    },
    true,
  );
}

export function clearChart(): void {
  chart?.clear();
}
