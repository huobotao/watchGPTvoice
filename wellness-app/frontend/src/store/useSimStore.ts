import { create } from 'zustand';
import { buildHumanSkeleton, clampEuler, initPersonState } from '@/simulator/core/skeleton';
import type { SkeletonDef, SceneState, EulerDeg, Vec3 } from '@/simulator/core/types';
import { PRESETS, getPreset } from '@/simulator/presets';

export type ViewMode = 'schematic' | 'mannequin' | 'dual';
export type Person = 'A' | 'B';

const skelA: SkeletonDef = buildHumanSkeleton('A', 1.72);
const skelB: SkeletonDef = buildHumanSkeleton('B', 1.65);

const limitsByJoint = new Map<string, ReturnType<typeof clampEuler> extends infer R ? any : never>();
for (const j of skelA.joints) limitsByJoint.set(j.name, j.limits);

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
  setViewMode(mode: ViewMode): void;
  toggleLabels(): void;
  loadPreset(id: string): void;
  setJoint(person: Person, joint: string, angles: Partial<EulerDeg>): void;
  setPelvisPos(person: Person, pos: Vec3): void;
  setPelvisRot(person: Person, rot: Partial<EulerDeg>): void;
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

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  toggleLabels() {
    set(s => ({ showLabels: !s.showLabels }));
  },

  loadPreset(id) {
    const preset = getPreset(id);
    if (!preset) return;
    // Deep clone the scene so edits don't mutate the preset.
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
