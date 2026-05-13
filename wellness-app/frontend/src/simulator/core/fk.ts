import { Matrix4, Euler, Vector3, Quaternion, MathUtils } from 'three';
import type { SkeletonDef, PersonState, EulerDeg, Vec3 } from './types';

const DEG = MathUtils.DEG2RAD;

export interface JointTransform {
  /** World-space position. */
  position: Vector3;
  /** World-space rotation as quaternion. */
  quaternion: Quaternion;
  /** Position of the parent joint (for drawing a bone). null for root joints. */
  parentPosition: Vector3 | null;
  /** Joint name. */
  name: string;
}

export interface ResolvedPose {
  /** All joint transforms keyed by joint name. */
  joints: Map<string, JointTransform>;
  /** Pelvis world transform (synthetic root). */
  pelvis: JointTransform;
}

function eulerToMatrix(e: EulerDeg, order: Euler['order'] = 'XYZ'): Matrix4 {
  const euler = new Euler(e.x * DEG, e.y * DEG, e.z * DEG, order);
  return new Matrix4().makeRotationFromEuler(euler);
}

function vec3FromArr(a: Vec3): Vector3 {
  return new Vector3(a[0], a[1], a[2]);
}

/**
 * Forward-kinematics solve: walk joint hierarchy and accumulate world transforms.
 * All offsets are multiplied by skeleton.height to convert to scene units (meters).
 */
export function resolvePose(skel: SkeletonDef, state: PersonState): ResolvedPose {
  const h = skel.height;

  // Pelvis is the synthetic root.
  const pelvisMat = new Matrix4()
    .compose(
      vec3FromArr(state.pelvisPos),
      new Quaternion().setFromEuler(
        new Euler(state.pelvisRot.x * DEG, state.pelvisRot.y * DEG, state.pelvisRot.z * DEG, 'XYZ')
      ),
      new Vector3(1, 1, 1)
    );

  const pelvisPos = new Vector3();
  const pelvisQuat = new Quaternion();
  const _scl = new Vector3();
  pelvisMat.decompose(pelvisPos, pelvisQuat, _scl);

  const pelvis: JointTransform = {
    name: 'pelvis',
    position: pelvisPos.clone(),
    quaternion: pelvisQuat.clone(),
    parentPosition: null
  };

  const matrices = new Map<string, Matrix4>();
  matrices.set('pelvis', pelvisMat);

  const result = new Map<string, JointTransform>();

  for (const j of skel.joints) {
    const parentName = j.parent ?? 'pelvis';
    const parentMat = matrices.get(parentName);
    if (!parentMat) {
      throw new Error(`Joint "${j.name}" references unknown parent "${parentName}"`);
    }

    const angles = state.joints[j.name] ?? { x: 0, y: 0, z: 0 };
    const localRot = eulerToMatrix(angles, 'XYZ');
    const localTranslate = new Matrix4().makeTranslation(
      j.offset[0] * h,
      j.offset[1] * h,
      j.offset[2] * h
    );
    // World = Parent * Translate * Rotate
    const worldMat = parentMat.clone().multiply(localTranslate).multiply(localRot);
    matrices.set(j.name, worldMat);

    const pos = new Vector3();
    const quat = new Quaternion();
    worldMat.decompose(pos, quat, _scl);

    // Parent position = parent matrix translation column.
    const parentPos = new Vector3().setFromMatrixPosition(parentMat);

    result.set(j.name, {
      name: j.name,
      position: pos,
      quaternion: quat,
      parentPosition: parentPos
    });
  }

  return { joints: result, pelvis };
}

/**
 * Helper: get the world position of a named joint, returning the pelvis when
 * called with 'pelvis'. Throws when the joint is unknown.
 */
export function getJointWorld(pose: ResolvedPose, name: string): Vector3 {
  if (name === 'pelvis') return pose.pelvis.position;
  const j = pose.joints.get(name);
  if (!j) throw new Error(`Unknown joint "${name}"`);
  return j.position;
}
