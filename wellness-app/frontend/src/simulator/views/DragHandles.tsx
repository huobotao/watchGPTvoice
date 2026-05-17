import { useRef } from 'react';
import { Plane, Vector3 } from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useSimStore, type Person } from '@/store/useSimStore';
import { CHAINS } from '@/simulator/core/ik';
import { resolvePose } from '@/simulator/core/fk';

const HANDLE_RADIUS = 0.028;
const PELVIS_HANDLE_RADIUS = 0.040;

const PERSON_COLOR: Record<Person, string> = {
  A: '#fbbf24', // amber — A's IK handles
  B: '#f472b6'  // pink — B's IK handles
};

interface HandleProps {
  position: Vector3;
  color: string;
  radius: number;
  /** Called with new world-space target on drag. */
  onDrag: (target: Vector3) => void;
  /** Optional cursor hint. */
  cursor?: string;
}

function Handle({ position, color, radius, onDrag, cursor = 'grab' }: HandleProps) {
  const { camera, gl } = useThree();
  const setDragging = useSimStore(s => s.setDragging);
  const planeRef = useRef(new Plane());
  const draggingRef = useRef(false);
  const offsetRef = useRef(new Vector3());

  function handleDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    gl.domElement.style.cursor = 'grabbing';

    // Build a camera-facing plane through the handle.
    const camForward = new Vector3();
    camera.getWorldDirection(camForward);
    planeRef.current.setFromNormalAndCoplanarPoint(camForward.negate(), position);

    // Record offset between pointer-ray intersection and handle so dragging
    // starts smooth (no jump under the cursor).
    const hit = new Vector3();
    if (e.ray.intersectPlane(planeRef.current, hit)) {
      offsetRef.current.subVectors(position, hit);
    } else {
      offsetRef.current.set(0, 0, 0);
    }
  }

  function handleMove(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const hit = new Vector3();
    if (e.ray.intersectPlane(planeRef.current, hit)) {
      hit.add(offsetRef.current);
      onDrag(hit);
    }
  }

  function handleUp(e: ThreeEvent<PointerEvent>) {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = false;
    setDragging(false);
    gl.domElement.style.cursor = '';
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
  }

  return (
    <mesh
      position={position.toArray()}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerOver={() => (gl.domElement.style.cursor = cursor)}
      onPointerOut={() => {
        if (!draggingRef.current) gl.domElement.style.cursor = '';
      }}
    >
      <sphereGeometry args={[radius, 16, 14]} />
      <meshBasicMaterial color={color} transparent opacity={0.78} depthTest={false} />
    </mesh>
  );
}

/**
 * Render IK + pelvis drag handles for one person. Reads the live pose from
 * the store (re-rendered each FK update) and routes drag events into the
 * `solveIK` / `setPelvisPos` actions.
 */
export function DragHandles({ person }: { person: Person }) {
  const skel = useSimStore(s => (person === 'A' ? s.skeletons.A : s.skeletons.B));
  const state = useSimStore(s => (person === 'A' ? s.scene.personA : s.scene.personB));
  const showHandles = useSimStore(s => s.showHandles);
  const solveIK = useSimStore(s => s.solveIK);
  const setPelvisPos = useSimStore(s => s.setPelvisPos);

  if (!showHandles) return null;

  const pose = resolvePose(skel, state);
  const color = PERSON_COLOR[person];

  const endEffectorNames = Object.keys(CHAINS);

  return (
    <group renderOrder={999}>
      {/* Pelvis = root translation handle */}
      <Handle
        position={pose.pelvis.position.clone()}
        color={color}
        radius={PELVIS_HANDLE_RADIUS}
        onDrag={t => setPelvisPos(person, [t.x, t.y, t.z])}
      />

      {endEffectorNames.map(name => {
        const jt = pose.joints.get(name);
        if (!jt) return null;
        return (
          <Handle
            key={`ik-${person}-${name}`}
            position={jt.position.clone()}
            color={color}
            radius={HANDLE_RADIUS}
            onDrag={t => solveIK(person, name, t)}
          />
        );
      })}
    </group>
  );
}
