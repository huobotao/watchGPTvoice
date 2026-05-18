import type { LngLat, RouteWithElevation, RouteStats } from "./providers/types";

type Listener<T> = (value: T) => void;

class Signal<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    for (const fn of this.listeners) fn(next);
  }

  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const waypoints = new Signal<LngLat[]>([]);
export const route = new Signal<RouteWithElevation | null>(null);
export const stats = new Signal<RouteStats | null>(null);
export const hoverIdx = new Signal<number | null>(null);
export const status = new Signal<{ text: string; level: "info" | "loading" | "error" }>({
  text: "点击地图添加路径点，或上传 GPX 文件。",
  level: "info",
});
