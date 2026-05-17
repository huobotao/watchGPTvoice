import { create } from 'zustand';
import { Vector3 } from 'three';
import { buildHumanSkeleton, clampEuler, initPersonState } from '@/simulator/core/skeleton';
import type { SkeletonDef, SceneState, EulerDeg, Vec3 } from '@/simulator/core/types';
import { PRESETS, getPreset } from '@/simulator/presets';
import { solveCCD, CHAINS } from '@/simulator/core/ik';

export type ViewMode = 'schematic' | 'mannequin' | 'dual';
export type Person = 'A' | 'B';

const skelA: SkeletonDef = buildHumanSkeleton('A', 1.72);
const skelB: SkeletonDef = buildHumanSkeleton('B', 1.65);

function findLimits(name: string) {
  const j = skelA.joints.find(j => j.name === name);
  return j?.limits ?? {};
}

interface SimStore {
  skeletons: { A: SkeletonDef; B: SkeletonDef };
  scene: SceneState;
  presetId: string | null;
  viewMode: ViewMode;
  showLabels: boolean;
  showHandles: boolean;
  /** True while the user is actively dragging an IK handle — used to disable OrbitControls. */
  isDragging: boolean;
  setViewMode(mode: ViewMode): void;
  toggleLabels(): void;
  toggleHandles(): void;
  setDragging(b: boolean): void;
  loadPreset(id: string): void;
  setJoint(person: Person, joint: string, angles: Partial<EulerDeg>): void;
  setPelvisPos(person: Person, pos: Vec3): void;
  setPelvisRot(person: Person, rot: Partial<EulerDeg>): void;
  /** Run CCD-IK so `endEffector` reaches `target` (world-space). */
  solveIK(person: Person, endEffector: string, target: Vector3): void;
  resetToRest(): void;
}

const initialScene: SceneState = {
  personA: initPersonState(skelA, [0, 0.18, 0]),
  personB: initPersonState(skelB, [0, 0.42, 0.05])
};

export const useSimStore = create<SimStore>((set, get) => ({
  skeletons: { A: skelA, B: skelB },
  scene: initialScene,
  presetId: null,
  viewMode: 'dual',
  showLabels: true,
  showHandles: true,
  isDragging: false,

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  toggleLabels() {
    set(s => ({ showLabels: !s.showLabels }));
  },

  toggleHandles() {
    set(s => ({ showHandles: !s.showHandles }));
  },

  setDragging(b) {
    set({ isDragging: b });
  },

  loadPreset(id) {
    const preset = getPreset(id);
    if (!preset) return;
    set({
      presetId: id,
      scene: structuredClone(preset.scene)
    });
  },

  setJoint(person, joint, angles) {
    const limits = findLimits(joint);
    set(s => {
      const personKey = person === 'A' ? 'personA' : 'personB';
      const current = s.scene[personKey].joints[joint] ?? { x: 0, y: 0, z: 0 };
      const next = clampEuler({ ...current, ...angles }, limits);
      return {
        scene: {
          ...s.scene,
          [personKey]: {
            ...s.scene[personKey],
            joints: { ...s.scene[personKey].joints, [joint]: next }
          }
        }
      };
    });
  },

  setPelvisPos(person, pos) {
    set(s => {
      const personKey = person === 'A' ? 'personA' : 'personB';
      return {
        scene: {
          ...s.scene,
          [personKey]: { ...s.scene[personKey], pelvisPos: pos }
        }
      };
    });
  },

  setPelvisRot(person, rot) {
    set(s => {
      const personKey = person === 'A' ? 'personA' : 'personB';
      return {
        scene: {
          ...s.scene,
          [personKey]: {
            ...s.scene[personKey],
            pelvisRot: { ...s.scene[personKey].pelvisRot, ...rot }
          }
        }
      };
    });
  },

  solveIK(person, endEffector, target) {
    const chain = CHAINS[endEffector];
    if (!chain) return;
    const skel = person === 'A' ? skelA : skelB;
    set(s => {
      const personKey = person === 'A' ? 'personA' : 'personB';
      const next = solveCCD(skel, s.scene[personKey], chain, target);
      return {
        scene: {
          ...s.scene,
          [personKey]: next
        }
      };
    });
  },

  resetToRest() {
    set({
      presetId: null,
      scene: {
        personA: initPersonState(skelA, [0, 0.18, 0]),
        personB: initPersonState(skelB, [0, 0.42, 0.05])
      }
    });
  }
}));

export { PRESETS };
