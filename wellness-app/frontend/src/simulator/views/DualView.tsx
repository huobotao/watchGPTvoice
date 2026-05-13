import { useSimStore } from '@/store/useSimStore';
import { Scene } from './Scene';

export function DualView() {
  const viewMode = useSimStore(s => s.viewMode);

  if (viewMode === 'schematic') {
    return (
      <div className="flex-1 min-h-0 relative">
        <ViewLabel>Schematic</ViewLabel>
        <Scene mode="schematic" />
      </div>
    );
  }
  if (viewMode === 'mannequin') {
    return (
      <div className="flex-1 min-h-0 relative">
        <ViewLabel>Mannequin</ViewLabel>
        <Scene mode="mannequin" />
      </div>
    );
  }

  // Dual: stacked vertically on narrow, side-by-side on wide
  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1 gap-px bg-slate-800">
      <div className="relative bg-slate-950 min-h-0">
        <ViewLabel>Schematic</ViewLabel>
        <Scene mode="schematic" />
      </div>
      <div className="relative bg-slate-950 min-h-0">
        <ViewLabel>Mannequin</ViewLabel>
        <Scene mode="mannequin" />
      </div>
    </div>
  );
}

function ViewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-slate-900/80 text-slate-300 pointer-events-none">
      {children}
    </div>
  );
}
