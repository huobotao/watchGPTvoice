import type { RouteStats } from "../providers/types";

const FIELDS: Array<{ key: keyof RouteStats; label: string; render: (v: number) => string; cls?: string }> = [
  { key: "totalLength", label: "全长", render: (v) => `${v.toFixed(2)} km` },
  { key: "ascent", label: "累计爬升", render: (v) => `${Math.round(v)} m`, cls: "ascent" },
  { key: "descent", label: "累计下降", render: (v) => `${Math.round(v)} m`, cls: "descent" },
  { key: "maxElevation", label: "最高点", render: (v) => `${Math.round(v)} m` },
  { key: "minElevation", label: "最低点", render: (v) => `${Math.round(v)} m` },
  { key: "averageGrade", label: "平均坡度", render: (v) => `${v.toFixed(1)} %` },
];

export function renderStats(el: HTMLElement, s: RouteStats | null): void {
  if (!s) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = FIELDS.map(
    (f) =>
      `<div class="stat"><span class="label">${f.label}</span><span class="value ${
        f.cls ?? ""
      }">${f.render(s[f.key])}</span></div>`,
  ).join("");
}
