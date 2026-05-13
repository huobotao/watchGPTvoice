import { useState } from 'react';
import { useSimStore, type Person } from '@/store/useSimStore';

/** Joints exposed to the slider UI. Wrist/ankle hidden in MVP to reduce clutter. */
const EXPOSED_JOINTS = [
  'lumbar',
  'thoracic',
  'neck',
  'shoulder_L',
  'elbow_L',
  'shoulder_R',
  'elbow_R',
  'hip_L',
  'knee_L',
  'hip_R',
  'knee_R'
] as const;

const AXIS_LABELS: Record<'x' | 'y' | 'z', string> = {
  x: 'flex',
  y: 'abd',
  z: 'rot'
};

export function ParamPanel() {
  const [person, setPerson] = useState<Person>('A');
  const skel = useSimStore(s => (person === 'A' ? s.skeletons.A : s.skeletons.B));
  const state = useSimStore(s => (person === 'A' ? s.scene.personA : s.scene.personB));
  const setJoint = useSimStore(s => s.setJoint);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-400">Joints</h2>
        <div className="flex bg-slate-800 rounded overflow-hidden text-xs">
          {(['A', 'B'] as Person[]).map(p => (
            <button
              key={p}
              onClick={() => setPerson(p)}
              className={`px-3 py-1 ${
                person === p
                  ? p === 'A'
                    ? 'bg-teal-700 text-white'
                    : 'bg-orange-700 text-white'
                  : 'text-slate-300'
              }`}
            >
              Person {p}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3">
        {EXPOSED_JOINTS.map(jointName => {
          const def = skel.joints.find(j => j.name === jointName);
          if (!def) return null;
          const angles = state.joints[jointName] ?? { x: 0, y: 0, z: 0 };
          return (
            <div key={jointName} className="text-xs">
              <div className="font-mono text-slate-300 mb-1">{jointName}</div>
              <div className="space-y-1">
                {(['x', 'y', 'z'] as const).map(axis => {
                  const limit = def.limits[axis];
                  if (!limit) return null;
                  return (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="w-8 text-slate-500 text-[10px] uppercase">
                        {AXIS_LABELS[axis]}
                      </span>
                      <input
                        type="range"
                        min={limit[0]}
                        max={limit[1]}
                        step={1}
                        value={angles[axis]}
                        onChange={e =>
                          setJoint(person, jointName, { [axis]: Number(e.target.value) })
                        }
                        className="flex-1 accent-teal-500"
                      />
                      <span className="w-10 text-right font-mono text-slate-400">
                        {Math.round(angles[axis])}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
