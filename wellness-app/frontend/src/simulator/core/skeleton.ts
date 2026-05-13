import type { JointDef, SkeletonDef, EulerDeg, PersonState, Vec3 } from './types';

// Biomechanically-grounded joint ranges (degrees), approximate adult averages.
// Source: orthopedic / kinesiology references, simplified for interactive use.
// Axis convention per joint: x = flexion/extension, y = lateral/abduction, z = axial rotation.

const ZERO: EulerDeg = { x: 0, y: 0, z: 0 };

// Heights expressed as fraction of total body height (1.0 = head top).
// Approximate anatomical proportions for an adult; used to seed offsets.
const H = {
  pelvisToLumbar: 0.08,
  lumbarToThoracic: 0.12,
  thoracicToNeck: 0.18,
  neckToHead: 0.06,
  shoulderFromThoracic: 0.04,
  shoulderHalfWidth: 0.11,
  upperArm: 0.18,
  forearm: 0.16,
  hipHalfWidth: 0.07,
  thigh: 0.245,
  shin: 0.245
};

function joint(
  name: string,
  parent: string | null,
  offset: Vec3,
  limits: JointDef['limits'],
  rest?: Partial<EulerDeg>
): JointDef {
  return { name, parent, offset, limits, rest };
}

/**
 * Build a single-person skeleton definition. Used twice (for personA and personB).
 * Offsets are expressed in skeleton-height units; render layer multiplies by `height`.
 */
export function buildHumanSkeleton(name: string, height = 1.7): SkeletonDef {
  return {
    name,
    height,
    joints: [
      // Spine chain
      joint('lumbar', null, [0, H.pelvisToLumbar, 0], {
        x: [-30, 90],
        y: [-30, 30],
        z: [-45, 45]
      }),
      joint('thoracic', 'lumbar', [0, H.lumbarToThoracic, 0], {
        x: [-20, 40],
        y: [-25, 25],
        z: [-30, 30]
      }),
      joint('neck', 'thoracic', [0, H.thoracicToNeck, 0], {
        x: [-45, 60],
        y: [-45, 45],
        z: [-80, 80]
      }),
      joint('head', 'neck', [0, H.neckToHead, 0], { x: [-30, 30] }),

      // Left arm
      joint('shoulder_L', 'thoracic', [H.shoulderHalfWidth, H.shoulderFromThoracic, 0], {
        x: [-60, 180],
        y: [0, 180],
        z: [-90, 90]
      }),
      joint('elbow_L', 'shoulder_L', [0, -H.upperArm, 0], {
        x: [0, 145]
      }),
      joint('wrist_L', 'elbow_L', [0, -H.forearm, 0], {
        x: [-70, 70],
        y: [-25, 35]
      }),

      // Right arm (mirror)
      joint('shoulder_R', 'thoracic', [-H.shoulderHalfWidth, H.shoulderFromThoracic, 0], {
        x: [-60, 180],
        y: [-180, 0],
        z: [-90, 90]
      }),
      joint('elbow_R', 'shoulder_R', [0, -H.upperArm, 0], {
        x: [0, 145]
      }),
      joint('wrist_R', 'elbow_R', [0, -H.forearm, 0], {
        x: [-70, 70],
        y: [-35, 25]
      }),

      // Left leg
      joint('hip_L', null, [H.hipHalfWidth, 0, 0], {
        x: [-20, 120],
        y: [-30, 45],
        z: [-45, 45]
      }),
      joint('knee_L', 'hip_L', [0, -H.thigh, 0], {
        x: [0, 135]
      }),
      joint('ankle_L', 'knee_L', [0, -H.shin, 0], {
        x: [-40, 30],
        y: [-25, 20]
      }),

      // Right leg (mirror)
      joint('hip_R', null, [-H.hipHalfWidth, 0, 0], {
        x: [-20, 120],
        y: [-45, 30],
        z: [-45, 45]
      }),
      joint('knee_R', 'hip_R', [0, -H.thigh, 0], {
        x: [0, 135]
      }),
      joint('ankle_R', 'knee_R', [0, -H.shin, 0], {
        x: [-40, 30],
        y: [-20, 25]
      })
    ]
  };
}

export function clamp(value: number, [lo, hi]: [number, number]): number {
  return Math.max(lo, Math.min(hi, value));
}

export function clampEuler(angles: EulerDeg, limits: JointDef['limits']): EulerDeg {
  return {
    x: limits.x ? clamp(angles.x, limits.x) : 0,
    y: limits.y ? clamp(angles.y, limits.y) : 0,
    z: limits.z ? clamp(angles.z, limits.z) : 0
  };
}

/** Initialize a person state with rest pose (all zeros unless joint defines `rest`). */
export function initPersonState(skel: SkeletonDef, pelvisPos: Vec3 = [0, 1, 0]): PersonState {
  const joints: Record<string, EulerDeg> = {};
  for (const j of skel.joints) {
    joints[j.name] = { ...ZERO, ...(j.rest ?? {}) };
  }
  return {
    pelvisPos,
    pelvisRot: { ...ZERO },
    joints
  };
}

/** Return whether a joint's current angles are inside biomechanical limits (no clamping). */
export function violatesLimits(angles: EulerDeg, limits: JointDef['limits']): boolean {
  if (limits.x && (angles.x < limits.x[0] || angles.x > limits.x[1])) return true;
  if (limits.y && (angles.y < limits.y[0] || angles.y > limits.y[1])) return true;
  if (limits.z && (angles.z < limits.z[0] || angles.z > limits.z[1])) return true;
  return false;
}
