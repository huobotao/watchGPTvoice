// Cyclic Coordinate Descent (CCD) inverse-kinematics solver.
//
// For a chain of joints [j0, j1, …, jN] anchored at jN's parent, iteratively
// rotate each joint so that the end-effector approaches a world-space target.
// Joint angles are clamped to the orthopaedic limits defined in the skeleton.

import { Quaternion, Vector3, Euler, MathUtils } from 'three';
import type { SkeletonDef, PersonState, EulerDeg } from './types';
import { resolvePose } from './fk';
import { clampEuler } from './skeleton';

const DEG = MathUtils.DEG2RAD;
const RAD = MathUtils.RAD2DEG;

export interface IKChain {
  /** End-effector joint name (its world position is what we move). */
  endEffector: string;
  /** Chain joints to rotate, ordered closest-to-EE first. */
  joints: string[];
  /** Human-readable name for UI. */
  label: string;
}

export const CHAINS: Record<string, IKChain> = {
  wrist_L: {
    endEffector: 'wrist_L',
    joints: ['elbow_L', 'shoulder_L'],
    label: 'Left hand'
  },
  wrist_R: {
    endEffector: 'wrist_R',
    joints: ['elbow_R', 'shoulder_R'],
    label: 'Right hand'
  },
  ankle_L: {
    endEffector: 'ankle_L',
    joints: ['knee_L', 'hip_L'],
    label: 'Left foot'
  },
  ankle_R: {
    endEffector: 'ankle_R',
    joints: ['knee_R', 'hip_R'],
    label: 'Right foot'
  }
};

export interface CCDOptions {
  maxIterations?: number;
  /** Stop once end-effector is within this distance (scene units / m). */
  epsilon?: number;
}

/**
 * Solve CCD IK and return a NEW PersonState with updated joint angles for the
 * joints in `chain.joints`. Pelvis pose and other joints are left untouched.
 *
 * Algorithm: for each iteration, walk the chain from end-effector inward; at
 * each joint compute the world-space rotation that maps (joint→end) onto
 * (joint→target), convert it to the joint's local frame, post-multiply it into
 * the joint's current local quaternion, and clamp the resulting Euler triple
 * to the joint's biomechanical limits.
 */
export function solveCCD(
  skel: SkeletonDef,
  state: PersonState,
  chain: IKChain,
  target: Vector3,
  opts: CCDOptions = {}
): PersonState {
  const maxIter = opts.maxIterations ?? 12;
  const eps = opts.epsilon ?? 0.005;

  // Work on a shallow-cloned state so the caller's input isn't mutated.
  const out: PersonState = {
    pelvisPos: [state.pelvisPos[0], state.pelvisPos[1], state.pelvisPos[2]],
    pelvisRot: { ...state.pelvisRot },
    joints: { ...state.joints }
  };

  // Quick joint-def lookup.
  const defByName = new Map(skel.joints.map(j => [j.name, j]));

  for (let it = 0; it < maxIter; it++) {
    // Check exit condition.
    const pose0 = resolvePose(skel, out);
    const ee0 = pose0.joints.get(chain.endEffector);
    if (!ee0) return out;
    if (ee0.position.distanceTo(target) < eps) break;

    for (const jointName of chain.joints) {
      const def = defByName.get(jointName);
      if (!def) continue;

      // Re-resolve every step so subsequent joints see the updated pose.
      const pose = resolvePose(skel, out);
      const eeT = pose.joints.get(chain.endEffector);
      const jt = pose.joints.get(jointName);
      if (!eeT || !jt) continue;

      // Parent's world quaternion = the frame in which our local rotation lives.
      const parentName = def.parent ?? 'pelvis';
      const parentT =
        parentName === 'pelvis' ? pose.pelvis : pose.joints.get(parentName);
      if (!parentT) continue;

      const eePos = eeT.position;
      const jPos = jt.position;
      const toEnd = new Vector3().subVectors(eePos, jPos);
      const toTarget = new Vector3().subVectors(target, jPos);
      if (toEnd.lengthSq() < 1e-8 || toTarget.lengthSq() < 1e-8) continue;
      toEnd.normalize();
      toTarget.normalize();

      // World-space rotation that aligns toEnd with toTarget.
      const deltaWorld = new Quaternion().setFromUnitVectors(toEnd, toTarget);

      // Convert to joint-local frame:
      //   worldQuat[j]_new   = deltaWorld * worldQuat[j]_old
      //   worldQuat[j]       = parentQuat * localQuat[j]
      //   ⟹ localQuat[j]_new = parentQuat⁻¹ * deltaWorld * parentQuat * localQuat[j]_old
      const parentInv = parentT.quaternion.clone().invert();
      const localDelta = parentInv.multiply(deltaWorld).multiply(parentT.quaternion);

      const cur = out.joints[jointName] ?? { x: 0, y: 0, z: 0 };
      const curQ = new Quaternion().setFromEuler(
        new Euler(cur.x * DEG, cur.y * DEG, cur.z * DEG, 'XYZ')
      );
      const newQ = localDelta.multiply(curQ);

      const e = new Euler().setFromQuaternion(newQ, 'XYZ');
      const newEuler: EulerDeg = { x: e.x * RAD, y: e.y * RAD, z: e.z * RAD };
      out.joints[jointName] = clampEuler(newEuler, def.limits);
    }
  }

  return out;
}
