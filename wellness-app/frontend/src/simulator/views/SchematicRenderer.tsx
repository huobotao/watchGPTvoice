import { useMemo } from 'react';
import { Line, Sphere, Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { resolvePose } from '../core/fk';
import { useSimStore, type Person } from '@/store/useSimStore';

const COLORS = {
  A: '#5eead4',
  B: '#fb923c'
};

export function SchematicRenderer({ person }: { person: Person }) {
  const skel = useSimStore(s => (person === 'A' ? s.skeletons.A : s.skeletons.B));
  const state = useSimStore(s => (person === 'A' ? s.scene.personA : s.scene.personB));
  const showLabels = useSimStore(s => s.showLabels);

  const pose = useMemo(() => resolvePose(skel, state), [skel, state]);
  const color = COLORS[person];

  // Build line segments for parent → child bones.
  const bones = useMemo(() => {
    const segs: { from: Vector3; to: Vector3; name: string }[] = [];
    for (const j of skel.joints) {
      const child = pose.joints.get(j.name);
      if (!child) continue;
      const fromPos = child.parentPosition!;
      segs.push({ from: fromPos.clone(), to: child.position.clone(), name: j.name });
    }
    return segs;
  }, [pose, skel]);

  // Pelvis forward arrow (+Z of pelvis).
  const forward = useMemo(() => {
    const tip = new Vector3(0, 0, 0.18).applyQuaternion(pose.pelvis.quaternion).add(pose.pelvis.position);
    return { from: pose.pelvis.position.clone(), to: tip };
  }, [pose]);

  return (
    <group>
      {/* Bones */}
      {bones.map(b => (
        <Line
          key={`bone-${person}-${b.name}`}
          points={[b.from.toArray(), b.to.toArray()]}
          color={color}
          lineWidth={2.4}
          transparent
          opacity={0.9}
        />
      ))}

      {/* Pelvis */}
      <Sphere args={[0.035, 16, 16]} position={pose.pelvis.position.toArray()}>
        <meshBasicMaterial color={color} />
      </Sphere>

      {/* Joints */}
      {[...pose.joints.values()].map(j => (
        <Sphere
          key={`joint-${person}-${j.name}`}
          args={[0.018, 12, 12]}
          position={j.position.toArray()}
        >
          <meshBasicMaterial color={color} />
        </Sphere>
      ))}

      {/* Pelvis forward axis arrow */}
      <Line
        points={[forward.from.toArray(), forward.to.toArray()]}
        color={color}
        lineWidth={3}
        dashed
        dashSize={0.02}
        gapSize={0.012}
      />

      {/* Numerical labels for the most informative joints */}
      {showLabels &&
        ['lumbar', 'hip_L', 'hip_R', 'knee_L', 'knee_R', 'shoulder_L', 'shoulder_R'].map(name => {
          const j = pose.joints.get(name);
          const angles = state.joints[name];
          if (!j || !angles) return null;
          const flexion = angles.x.toFixed(0);
          return (
            <Html
              key={`label-${person}-${name}`}
              position={j.position.toArray()}
              center
              distanceFactor={3.2}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="px-1 py-px rounded text-[10px] font-mono whitespace-nowrap"
                style={{ background: 'rgba(15,23,42,0.85)', color }}
              >
                {flexion}°
              </div>
            </Html>
          );
        })}
    </group>
  );
}
