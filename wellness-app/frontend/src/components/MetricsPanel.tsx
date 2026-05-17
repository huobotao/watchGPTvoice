import { useMemo } from 'react';
import { useSimStore } from '@/store/useSimStore';
import { resolvePose } from '@/simulator/core/fk';
import { computeMetrics } from '@/simulator/core/metrics';
import { annotate } from '@/simulator/core/annotations';

export function MetricsPanel() {
  const skelA = useSimStore(s => s.skeletons.A);
  const skelB = useSimStore(s => s.skeletons.B);
  const stateA = useSimStore(s => s.scene.personA);
  const stateB = useSimStore(s => s.scene.personB);

  const metrics = useMemo(() => {
    const poseA = resolvePose(skelA, stateA);
    const poseB = resolvePose(skelB, stateB);
    return computeMetrics(poseA, poseB);
  }, [skelA, skelB, stateA, stateB]);

  const notes = useMemo(() => annotate(metrics), [metrics]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-400">Geometric metrics</h2>
      </div>

      <div className="px-3 py-2 grid grid-cols-2 gap-y-1 text-xs font-mono border-b border-slate-800">
        <Stat label="Pelvic distance" value={`${(metrics.pelvicDistance * 100).toFixed(1)} cm`} />
        <Stat label="Engagement depth" value={`${(metrics.engagementDepth * 100).toFixed(1)} cm`} />
        <Stat label="Yaw delta" value={`${metrics.pelvicYawDelta.toFixed(0)}°`} />
        <Stat label="Pitch delta" value={`${metrics.pelvicPitchDelta.toFixed(0)}°`} />
        <Stat label="Supports A" value={`${metrics.supportPointsA}`} />
        <Stat label="Supports B" value={`${metrics.supportPointsB}`} />
      </div>

      <div className="overflow-y-auto flex-1 px-3 py-2 space-y-2">
        {notes.map((n, i) => (
          <div
            key={i}
            className={`text-xs rounded border px-2 py-1.5 ${
              n.tone === 'warn'
                ? 'border-amber-700 bg-amber-950/40 text-amber-100'
                : n.tone === 'good'
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-100'
                : 'border-slate-700 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="font-semibold">{n.title}</div>
            <div className="text-slate-300 mt-0.5">{n.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-500 text-[10px] uppercase">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
