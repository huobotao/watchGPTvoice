import type { SceneState, PersonState } from '../core/types';

export interface Preset {
  id: string;
  name: string;
  category: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  summary: string;
  scene: SceneState;
}

const ZERO = { x: 0, y: 0, z: 0 };

/** Helper: build a person state by partial joint overrides. */
function person(
  pelvisPos: [number, number, number],
  pelvisRot: Partial<typeof ZERO>,
  joints: Record<string, Partial<typeof ZERO>>
): PersonState {
  const j: PersonState['joints'] = {};
  for (const [name, angles] of Object.entries(joints)) {
    j[name] = { ...ZERO, ...angles };
  }
  return {
    pelvisPos,
    pelvisRot: { ...ZERO, ...pelvisRot },
    joints: j
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'missionary',
    name: 'Missionary',
    category: 'basic',
    tags: ['face-to-face', 'partner-on-top', 'classic'],
    summary:
      'Partner A lies supine; partner B above, face-to-face. Foundational geometry: pelvises aligned along a single axis, both pitched ~30° from horizontal.',
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 35, y: 20 },
          hip_R: { x: 35, y: -20 },
          knee_L: { x: 75 },
          knee_R: { x: 75 },
          shoulder_L: { x: 30, y: 60 },
          shoulder_R: { x: 30, y: -60 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.42, 0.05],
        { x: -100, y: 180 },
        {
          hip_L: { x: 25, y: 15 },
          hip_R: { x: 25, y: -15 },
          knee_L: { x: 60 },
          knee_R: { x: 60 },
          shoulder_L: { x: 80, y: 40 },
          shoulder_R: { x: 80, y: -40 },
          elbow_L: { x: 35 },
          elbow_R: { x: 35 }
        }
      )
    }
  },

  {
    id: 'cowgirl',
    name: 'Partner-on-top (Cowgirl)',
    category: 'basic',
    tags: ['face-to-face', 'partner-on-top', 'classic'],
    summary:
      'Partner A supine; partner B seated upright on A facing them. Pelvises stacked vertically — B controls rhythm and angle via knee flexion.',
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 10, y: 25 },
          hip_R: { x: 10, y: -25 },
          knee_L: { x: 25 },
          knee_R: { x: 25 },
          shoulder_L: { x: 0, y: 30 },
          shoulder_R: { x: 0, y: -30 }
        }
      ),
      personB: person(
        [0, 0.55, 0],
        { y: 180 },
        {
          hip_L: { x: 95, y: 30 },
          hip_R: { x: 95, y: -30 },
          knee_L: { x: 110 },
          knee_R: { x: 110 },
          lumbar: { x: -5 }
        }
      )
    }
  },

  {
    id: 'doggy',
    name: 'Rear-entry (Doggy)',
    category: 'basic',
    tags: ['same-direction', 'kneeling', 'classic'],
    summary:
      'Both partners on knees, facing the same direction. Partner A in a quadruped position; partner B kneels behind. Allows deeper geometric reach with adjustable spine curvature.',
    scene: {
      personA: person(
        [0, 0.45, 0],
        { x: -75 },
        {
          hip_L: { x: 80, y: 15 },
          hip_R: { x: 80, y: -15 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 90, y: 30 },
          shoulder_R: { x: 90, y: -30 },
          elbow_L: { x: 20 },
          elbow_R: { x: 20 },
          lumbar: { x: -10 }
        }
      ),
      personB: person(
        [0, 0.48, -0.3],
        { x: -10 },
        {
          hip_L: { x: 90, y: 20 },
          hip_R: { x: 90, y: -20 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 }
        }
      )
    }
  },

  {
    id: 'spooning',
    name: 'Spooning (side-lying)',
    category: 'basic',
    tags: ['same-direction', 'lying', 'low-effort'],
    summary:
      'Both partners on their side, B behind A, same facing direction. Low energy expenditure; pelvises offset laterally, partial overlap.',
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90, z: 90 },
        {
          hip_L: { x: 40, y: 0 },
          hip_R: { x: 40, y: 0 },
          knee_L: { x: 50 },
          knee_R: { x: 50 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 20 },
          elbow_R: { x: 20 }
        }
      ),
      personB: person(
        [-0.04, 0.18, -0.18],
        { x: -90, z: 90 },
        {
          hip_L: { x: 45, y: 0 },
          hip_R: { x: 45, y: 0 },
          knee_L: { x: 55 },
          knee_R: { x: 55 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      )
    }
  },

  {
    id: 'facing-sitting',
    name: 'Face-to-face seated',
    category: 'basic',
    tags: ['face-to-face', 'seated', 'intimate'],
    summary:
      'Both seated, facing each other, partner B in partner A\'s lap. Pelvises directly opposed, allows eye contact, full upper-body engagement.',
    scene: {
      personA: person(
        [0, 0.32, 0],
        {},
        {
          hip_L: { x: 90, y: 25 },
          hip_R: { x: 90, y: -25 },
          knee_L: { x: 75 },
          knee_R: { x: 75 },
          shoulder_L: { x: 25, y: 25 },
          shoulder_R: { x: 25, y: -25 },
          elbow_L: { x: 70 },
          elbow_R: { x: 70 }
        }
      ),
      personB: person(
        [0, 0.42, 0.15],
        { y: 180 },
        {
          hip_L: { x: 90, y: 30 },
          hip_R: { x: 90, y: -30 },
          knee_L: { x: 110 },
          knee_R: { x: 110 },
          shoulder_L: { x: 35, y: 30 },
          shoulder_R: { x: 35, y: -30 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      )
    }
  }
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id);
}
