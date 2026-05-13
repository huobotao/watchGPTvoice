// Core types for the parametric biomechanical skeleton model.
// Coordinate convention: +Y up, +Z forward (facing direction), right-handed.
// All angles stored as degrees for human readability in presets and UI.

export type Vec3 = [number, number, number];

export type EulerDeg = { x: number; y: number; z: number };

export type AxisLimits = {
  x?: [number, number];
  y?: [number, number];
  z?: [number, number];
};

export interface JointDef {
  name: string;
  parent: string | null;
  /** Offset from parent joint, in "skeleton units" (1.0 ≈ total body height when scaled). */
  offset: Vec3;
  /** Allowed rotation range per axis (degrees). Missing axis = fixed at 0. */
  limits: AxisLimits;
  /** Optional rest pose (degrees) used when initializing a fresh skeleton. */
  rest?: Partial<EulerDeg>;
}

export interface SkeletonDef {
  /** Identifier for this skeleton template. */
  name: string;
  /** Total body height in scene units (meters). 1.7 = ~adult. */
  height: number;
  /** Joints ordered such that parents always precede children. */
  joints: JointDef[];
}

/** Live parametric state of one person — Euler angles keyed by joint name + pelvis pose. */
export interface PersonState {
  pelvisPos: Vec3;
  pelvisRot: EulerDeg;
  joints: Record<string, EulerDeg>;
}

/** Live state of the full two-person scene. */
export interface SceneState {
  personA: PersonState;
  personB: PersonState;
}
