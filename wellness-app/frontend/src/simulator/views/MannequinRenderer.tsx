import { useMemo } from 'react';
import { Vector3, Quaternion, Euler, MathUtils, type ColorRepresentation } from 'three';
import { resolvePose, type ResolvedPose } from '../core/fk';
import { useSimStore, type Person } from '@/store/useSimStore';

const COLORS: Record<Person, ColorRepresentation> = {
  A: '#d6f5ee',
  B: '#fde7d0'
};

const ACCENT: Record<Person, ColorRepresentation> = {
  A: '#5eead4',
  B: '#fb923c'
};

interface LimbSegment {
  from: Vector3;
  to: Vector3;
  radius: number;
}

/** Capsule-like cylinder going from `from` to `to`. */
function Limb({
  from,
  to,
  radius,
  color
}: LimbSegment & { color: ColorRepresentation }) {
  const dir = new Vector3().subVectors(to, from);
  const length = dir.length();
  const mid = new Vector3().addVectors(from, to).multiplyScalar(0.5);
  // Default cylinder axis is +Y, rotate so +Y aligns with dir.
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());

  return (
    <group position={mid.toArray()} quaternion={[quat.x, quat.y, quat.z, quat.w]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 14, 1, false]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      {/* Ball joints at each end for softer silhouette */}
      <mesh position={[0, length / 2, 0]}>
        <sphereGeometry args={[radius * 1.05, 14, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, -length / 2, 0]}>
        <sphereGeometry args={[radius * 1.05, 14, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

function buildLimbs(pose: ResolvedPose, height: number): LimbSegment[] {
  const limbs: LimbSegment[] = [];
  const torso = 0.06 * height;
  const upperArm = 0.034 * height;
  const forearm = 0.028 * height;
  const thigh = 0.05 * height;
  const shin = 0.04 * height;
  const neck = 0.028 * height;

  const get = (name: string) => pose.joints.get(name);

  // Torso: lumbar → thoracic
  const lumbar = get('lumbar');
  const thoracic = get('thoracic');
  if (lumbar && thoracic) {
    limbs.push({ from: pose.pelvis.position, to: lumbar.position, radius: torso });
    limbs.push({ from: lumbar.position, to: thoracic.position, radius: torso * 0.95 });
  }

  // Neck
  const neckJ = get('neck');
  if (thoracic && neckJ) limbs.push({ from: thoracic.position, to: neckJ.position, radius: neck });

  // Arms
  for (const side of ['L', 'R'] as const) {
    const sh = get(`shoulder_${side}`);
    const el = get(`elbow_${side}`);
    const wr = get(`wrist_${side}`);
    if (thoracic && sh) limbs.push({ from: thoracic.position, to: sh.position, radius: torso * 0.7 });
    if (sh && el) limbs.push({ from: sh.position, to: el.position, radius: upperArm });
    if (el && wr) limbs.push({ from: el.position, to: wr.position, radius: forearm });
  }

  // Legs
  for (const side of ['L', 'R'] as const) {
    const hip = get(`hip_${side}`);
    const knee = get(`knee_${side}`);
    const ankle = get(`ankle_${side}`);
    if (hip) limbs.push({ from: pose.pelvis.position, to: hip.position, radius: torso * 0.7 });
    if (hip && knee) limbs.push({ from: hip.position, to: knee.position, radius: thigh });
    if (knee && ankle) limbs.push({ from: knee.position, to: ankle.position, radius: shin });
  }

  return limbs;
}

export function MannequinRenderer({ person }: { person: Person }) {
  const skel = useSimStore(s => (person === 'A' ? s.skeletons.A : s.skeletons.B));
  const state = useSimStore(s => (person === 'A' ? s.scene.personA : s.scene.personB));
  const pose = useMemo(() => resolvePose(skel, state), [skel, state]);

  const limbs = useMemo(() => buildLimbs(pose, skel.height), [pose, skel.height]);
  const skinColor = COLORS[person];

  // Head position: 0.06 height above neck along neck's local +Y, or fall back to thoracic + offset.
  const headPos = useMemo(() => {
    const neckJ = pose.joints.get('neck');
    if (!neckJ) return new Vector3();
    const up = new Vector3(0, 0.06 * skel.height, 0).applyQuaternion(neckJ.quaternion);
    return new Vector3().addVectors(neckJ.position, up);
  }, [pose, skel.height]);

  // Pelvis center block — represented as a slightly elongated ellipsoid.
  const pelvisQuat = pose.pelvis.quaternion;

  return (
    <group>
      {limbs.map((l, i) => (
        <Limb key={`limb-${person}-${i}`} {...l} color={skinColor} />
      ))}

      {/* Pelvis block */}
      <mesh
        position={pose.pelvis.position.toArray()}
        quaternion={[pelvisQuat.x, pelvisQuat.y, pelvisQuat.z, pelvisQuat.w]}
      >
        <boxGeometry args={[0.18 * skel.height, 0.07 * skel.height, 0.13 * skel.height]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} />
      </mesh>

      {/* Head: simple ellipsoid (oriented sphere scaled) */}
      <mesh position={headPos.toArray()}>
        <sphereGeometry args={[0.065 * skel.height, 18, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} />
      </mesh>

      {/* Subtle accent ring at pelvis to distinguish person color */}
      <mesh
        position={pose.pelvis.position.toArray()}
        quaternion={[pelvisQuat.x, pelvisQuat.y, pelvisQuat.z, pelvisQuat.w]}
      >
        <torusGeometry args={[0.055 * skel.height, 0.005, 8, 24]} />
        <meshBasicMaterial color={ACCENT[person]} />
      </mesh>
    </group>
  );
}
