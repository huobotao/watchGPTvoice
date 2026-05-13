import { Vector3, MathUtils } from 'three';
import type { ResolvedPose } from './fk';

const RAD = MathUtils.RAD2DEG;

export interface Metrics {
  /** Distance between pelvis centers (meters). */
  pelvicDistance: number;
  /**
   * Alignment of the two pelvises along their facing axes (degrees).
   * 0° = perfectly opposed (facing each other), 180° = same direction, 90° = perpendicular.
   */
  pelvicYawDelta: number;
  /** Tilt difference of pelvis pitch (degrees). Positive = A more tilted forward. */
  pelvicPitchDelta: number;
  /** Heuristic "main contact axis" from pelvis A → pelvis B (unit vector world space). */
  contactAxis: { x: number; y: number; z: number };
  /**
   * Heuristic "engagement depth" — projection of the A→B vector onto pelvis A's
   * forward direction (meters; positive = B is in front of A's pelvis).
   */
  engagementDepth: number;
  /** Support points (Y < threshold) for each person, used for stability. */
  supportPointsA: number;
  supportPointsB: number;
  /**
   * Loose stability indicator (0..1). 1 = stable, 0 = needs external support.
   * Derived from support-point count and pelvis height. Indicative only.
   */
  stabilityA: number;
  stabilityB: number;
}

const GROUND_Y_THRESHOLD = 0.08;
const SUPPORT_JOINTS = ['ankle_L', 'ankle_R', 'wrist_L', 'wrist_R'];

function pelvisForward(pose: ResolvedPose): Vector3 {
  // The pelvis "forward" is +Z in its local frame. Rotate by its world quaternion.
  return new Vector3(0, 0, 1).applyQuaternion(pose.pelvis.quaternion).normalize();
}

function pelvisYaw(pose: ResolvedPose): number {
  const fwd = pelvisForward(pose);
  return Math.atan2(fwd.x, fwd.z) * RAD;
}

function pelvisPitch(pose: ResolvedPose): number {
  const fwd = pelvisForward(pose);
  return Math.asin(MathUtils.clamp(-fwd.y, -1, 1)) * RAD;
}

function countSupports(pose: ResolvedPose): number {
  let n = 0;
  for (const name of SUPPORT_JOINTS) {
    const j = pose.joints.get(name);
    if (j && j.position.y < GROUND_Y_THRESHOLD) n++;
  }
  // Pelvis on the ground also counts (e.g. seated postures).
  if (pose.pelvis.position.y < GROUND_Y_THRESHOLD + 0.05) n++;
  return n;
}

export function computeMetrics(poseA: ResolvedPose, poseB: ResolvedPose): Metrics {
  const pa = poseA.pelvis.position;
  const pb = poseB.pelvis.position;
  const delta = new Vector3().subVectors(pb, pa);
  const distance = delta.length();

  const yawA = pelvisYaw(poseA);
  const yawB = pelvisYaw(poseB);
  let yawDelta = Math.abs(((yawA - yawB + 540) % 360) - 180);
  yawDelta = Math.abs(yawDelta);

  const pitchDelta = pelvisPitch(poseA) - pelvisPitch(poseB);

  const fwdA = pelvisForward(poseA);
  const axisUnit = distance > 1e-6 ? delta.clone().multiplyScalar(1 / distance) : new Vector3();
  const engagementDepth = delta.dot(fwdA);

  const supportsA = countSupports(poseA);
  const supportsB = countSupports(poseB);

  return {
    pelvicDistance: distance,
    pelvicYawDelta: yawDelta,
    pelvicPitchDelta: pitchDelta,
    contactAxis: { x: axisUnit.x, y: axisUnit.y, z: axisUnit.z },
    engagementDepth,
    supportPointsA: supportsA,
    supportPointsB: supportsB,
    stabilityA: MathUtils.clamp(supportsA / 3, 0, 1),
    stabilityB: MathUtils.clamp(supportsB / 3, 0, 1)
  };
}
