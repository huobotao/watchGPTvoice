import type { SceneState, PersonState } from '../core/types';

export type PresetCategory = 'basic' | 'intermediate' | 'advanced';

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
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

// ---------------------------------------------------------------------------
// Coordinate convention reminder (see core/types.ts):
//   +Y up, +Z forward (facing), right-handed. All angles in degrees.
//   pelvisRot.x = -90 → supine (lying on back). +90 → prone (face down).
//   pelvisRot.y = 180 → facing -Z (turned around).
//   pelvisRot.z = ±90 → side-lying (rolled onto a side).
// Hip x = flexion (knee toward chest). Knee x = flexion. Shoulder x = flexion
// (arm forward/up). Elbow x = flexion. Limits enforced in store/clampEuler.
// ---------------------------------------------------------------------------

export const PRESETS: Preset[] = [
  // ─── Basic: foundational supine / kneeling references ────────────────────
  {
    id: 'missionary',
    name: 'Missionary',
    category: 'basic',
    tags: ['face-to-face', 'partner-on-top', 'classic'],
    summary:
      'Partner A supine; partner B above, face-to-face. Foundational geometry: pelvises aligned along a single axis, both pitched ~30° from horizontal.',
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
    id: 'coital-alignment',
    name: 'Coital alignment (CAT)',
    category: 'basic',
    tags: ['face-to-face', 'partner-on-top', 'pelvic-tilt'],
    summary:
      'Missionary variant with partner B shifted ~5 cm cranially and both pelvises tilted into rocking contact. Trades depth for sustained anterior pressure.',
    scene: {
      personA: person(
        [0, 0.20, 0],
        { x: -100 },
        {
          hip_L: { x: 30, y: 15 },
          hip_R: { x: 30, y: -15 },
          knee_L: { x: 65 },
          knee_R: { x: 65 },
          shoulder_L: { x: 30, y: 60 },
          shoulder_R: { x: 30, y: -60 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.44, 0.10],
        { x: -110, y: 180 },
        {
          hip_L: { x: 20, y: 10 },
          hip_R: { x: 20, y: -10 },
          knee_L: { x: 55 },
          knee_R: { x: 55 },
          shoulder_L: { x: 90, y: 30 },
          shoulder_R: { x: 90, y: -30 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
        }
      )
    }
  },

  {
    id: 'pillow-prop',
    name: 'Pillow-propped supine',
    category: 'basic',
    tags: ['face-to-face', 'pelvic-elevation', 'support'],
    summary:
      'Missionary with partner A’s pelvis elevated ~5 cm on a wedge, increasing pelvic angle and reducing lumbar shear for partner B.',
    scene: {
      personA: person(
        [0, 0.23, 0],
        { x: -75 },
        {
          hip_L: { x: 55, y: 20 },
          hip_R: { x: 55, y: -20 },
          knee_L: { x: 85 },
          knee_R: { x: 85 },
          shoulder_L: { x: 20, y: 50 },
          shoulder_R: { x: 20, y: -50 },
          elbow_L: { x: 40 },
          elbow_R: { x: 40 }
        }
      ),
      personB: person(
        [0, 0.44, 0.05],
        { x: -90, y: 180 },
        {
          hip_L: { x: 30, y: 15 },
          hip_R: { x: 30, y: -15 },
          knee_L: { x: 60 },
          knee_R: { x: 60 },
          shoulder_L: { x: 80, y: 35 },
          shoulder_R: { x: 80, y: -35 },
          elbow_L: { x: 35 },
          elbow_R: { x: 35 }
        }
      )
    }
  },

  {
    id: 'closed-missionary',
    name: 'Closed missionary',
    category: 'basic',
    tags: ['face-to-face', 'partner-on-top', 'narrow-base'],
    summary:
      'Partner A’s legs together (zero hip abduction); partner B straddles outside A’s thighs. Narrows the geometric base and shifts contact angle.',
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 25 },
          hip_R: { x: 25 },
          knee_L: { x: 15 },
          knee_R: { x: 15 },
          shoulder_L: { x: 20, y: 40 },
          shoulder_R: { x: 20, y: -40 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      ),
      personB: person(
        [0, 0.45, 0.05],
        { x: -100, y: 180 },
        {
          hip_L: { x: 30, y: 35 },
          hip_R: { x: 30, y: -35 },
          knee_L: { x: 65 },
          knee_R: { x: 65 },
          shoulder_L: { x: 85, y: 40 },
          shoulder_R: { x: 85, y: -40 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
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
      'Partner A supine; partner B seated upright on A, facing them. Pelvises stacked vertically — B controls rhythm and angle via knee flexion.',
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
    id: 'reverse-cowgirl',
    name: 'Reverse cowgirl',
    category: 'basic',
    tags: ['same-direction', 'partner-on-top', 'classic'],
    summary:
      'As cowgirl, but partner B faces away from A. Inverts the pelvic contact angle and changes line-of-sight; less stable for forward lean.',
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
        {},
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
    id: 'spoon-facing',
    name: 'Facing side-lying',
    category: 'basic',
    tags: ['face-to-face', 'lying', 'low-effort'],
    summary:
      'Both partners on their side, facing each other. Pelvises directly opposed at the same height; symmetric upper-body engagement, minimal weight transfer.',
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90, z: 90 },
        {
          hip_L: { x: 60, y: 0 },
          hip_R: { x: 60, y: 0 },
          knee_L: { x: 70 },
          knee_R: { x: 70 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 },
          elbow_L: { x: 40 },
          elbow_R: { x: 40 }
        }
      ),
      personB: person(
        [0, 0.18, 0.18],
        { x: -90, y: 180, z: -90 },
        {
          hip_L: { x: 60, y: 0 },
          hip_R: { x: 60, y: 0 },
          knee_L: { x: 70 },
          knee_R: { x: 70 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 },
          elbow_L: { x: 40 },
          elbow_R: { x: 40 }
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
      "Both seated, facing each other, partner B in partner A's lap. Pelvises directly opposed, allows eye contact, full upper-body engagement.",
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
  },

  {
    id: 'kneeling-face-to-face',
    name: 'Upright kneeling, facing',
    category: 'basic',
    tags: ['face-to-face', 'kneeling', 'embrace'],
    summary:
      "Both partners kneeling upright, knees on the ground, torsos vertical and embraced. Pelvises level and aligned; weight borne through tibia.",
    scene: {
      personA: person(
        [0, 0.50, 0],
        {},
        {
          hip_L: { x: 0, y: 10 },
          hip_R: { x: 0, y: -10 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 50, y: 35 },
          shoulder_R: { x: 50, y: -35 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.50, 0.12],
        { y: 180 },
        {
          hip_L: { x: 0, y: 10 },
          hip_R: { x: 0, y: -10 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 50, y: 35 },
          shoulder_R: { x: 50, y: -35 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      )
    }
  },

  // ─── Intermediate ────────────────────────────────────────────────────────
  {
    id: 'side-saddle',
    name: 'Side-saddle on lap',
    category: 'intermediate',
    tags: ['perpendicular', 'partner-on-top', 'asymmetric'],
    summary:
      "Partner A supine; partner B sits across A's hips rotated 90° (legs together to one side). Asymmetric hip loading; produces a transverse pelvic angle.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 15, y: 20 },
          hip_R: { x: 15, y: -20 },
          knee_L: { x: 30 },
          knee_R: { x: 30 },
          shoulder_L: { x: 10, y: 40 },
          shoulder_R: { x: 10, y: -40 }
        }
      ),
      personB: person(
        [0, 0.50, 0],
        { y: 90 },
        {
          hip_L: { x: 90, y: -10 },
          hip_R: { x: 90, y: 10 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          lumbar: { z: 10 }
        }
      )
    }
  },

  {
    id: 'scissor',
    name: 'Scissor (transverse)',
    category: 'intermediate',
    tags: ['perpendicular', 'lying', 'low-effort'],
    summary:
      "Partner A supine, knees raised; partner B side-lying perpendicular to A, with one leg under A's raised thigh and one over. Forms an interlaced 'X'.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 70, y: 25 },
          hip_R: { x: 70, y: -25 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 40 },
          elbow_R: { x: 40 }
        }
      ),
      personB: person(
        [0.10, 0.18, 0],
        { x: -90, y: 90, z: 90 },
        {
          hip_L: { x: 30, y: 15 },
          hip_R: { x: 10, y: -15 },
          knee_L: { x: 60 },
          knee_R: { x: 20 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 80, y: -30 },
          elbow_L: { x: 30 },
          elbow_R: { x: 40 }
        }
      )
    }
  },

  {
    id: 'lazy-doggy',
    name: 'Prone stacked (lazy doggy)',
    category: 'intermediate',
    tags: ['same-direction', 'prone', 'low-effort'],
    summary:
      "Partner A flat prone; partner B lies on A's back in the same direction. Minimal muscular load; pelvic angle determined by A's lumbar curve.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: 90 },
        {
          hip_L: { x: 5, y: 10 },
          hip_R: { x: 5, y: -10 },
          knee_L: { x: 10 },
          knee_R: { x: 10 },
          shoulder_L: { x: 60, y: 60 },
          shoulder_R: { x: 60, y: -60 },
          elbow_L: { x: 80 },
          elbow_R: { x: 80 },
          lumbar: { x: -15 }
        }
      ),
      personB: person(
        [0, 0.36, 0],
        { x: 90 },
        {
          hip_L: { x: 5, y: 10 },
          hip_R: { x: 5, y: -10 },
          knee_L: { x: 10 },
          knee_R: { x: 10 },
          shoulder_L: { x: 30, y: 50 },
          shoulder_R: { x: 30, y: -50 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      )
    }
  },

  {
    id: 'prone-bone',
    name: 'Prone rear-entry',
    category: 'intermediate',
    tags: ['same-direction', 'prone', 'rear-entry'],
    summary:
      "Partner A prone with a pillow under hips for slight elevation; partner B kneels astride A's thighs. Combines the depth of doggy with full-body contact.",
    scene: {
      personA: person(
        [0, 0.20, 0],
        { x: 90 },
        {
          hip_L: { x: 5, y: 15 },
          hip_R: { x: 5, y: -15 },
          knee_L: { x: 10 },
          knee_R: { x: 10 },
          shoulder_L: { x: 90, y: 40 },
          shoulder_R: { x: 90, y: -40 },
          elbow_L: { x: 70 },
          elbow_R: { x: 70 },
          lumbar: { x: -20 }
        }
      ),
      personB: person(
        [0, 0.48, -0.05],
        { x: -10 },
        {
          hip_L: { x: 95, y: 25 },
          hip_R: { x: 95, y: -25 },
          knee_L: { x: 100 },
          knee_R: { x: 100 },
          shoulder_L: { x: 60, y: 40 },
          shoulder_R: { x: 60, y: -40 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
        }
      )
    }
  },

  {
    id: 'pretzel-dip',
    name: 'Pretzel',
    category: 'intermediate',
    tags: ['perpendicular', 'side-lying', 'asymmetric'],
    summary:
      "Partner A side-lying with the upper leg lifted and bent at 90°; partner B kneels facing A, straddling A's lower leg. Mixes face-to-face and side-entry geometry.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90, z: 90 },
        {
          hip_L: { x: 90, y: 30 },
          hip_R: { x: 30, y: 0 },
          knee_L: { x: 90 },
          knee_R: { x: 40 },
          shoulder_L: { x: 80, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 80 },
          elbow_R: { x: 30 }
        }
      ),
      personB: person(
        [0.05, 0.50, 0.05],
        { y: -45 },
        {
          hip_L: { x: 90, y: 25 },
          hip_R: { x: 90, y: -25 },
          knee_L: { x: 100 },
          knee_R: { x: 100 },
          shoulder_L: { x: 40, y: 40 },
          shoulder_R: { x: 40, y: -40 }
        }
      )
    }
  },

  {
    id: 'yab-yum',
    name: 'Yab-yum',
    category: 'intermediate',
    tags: ['face-to-face', 'seated', 'tantric'],
    summary:
      "Partner A cross-legged on the floor; partner B sits in A's lap, legs wrapped around A's waist. Symmetric vertical embrace — pelvises stacked, eye-line shared.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        {},
        {
          hip_L: { x: 90, y: 40 },
          hip_R: { x: 90, y: -40 },
          knee_L: { x: 120 },
          knee_R: { x: 120 },
          shoulder_L: { x: 30, y: 35 },
          shoulder_R: { x: 30, y: -35 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.36, 0.10],
        { y: 180 },
        {
          hip_L: { x: 100, y: 40 },
          hip_R: { x: 100, y: -40 },
          knee_L: { x: 100 },
          knee_R: { x: 100 },
          shoulder_L: { x: 50, y: 40 },
          shoulder_R: { x: 50, y: -40 },
          elbow_L: { x: 80 },
          elbow_R: { x: 80 }
        }
      )
    }
  },

  {
    id: 'lotus-embrace',
    name: 'Lotus embrace',
    category: 'intermediate',
    tags: ['face-to-face', 'seated', 'deep-flexion'],
    summary:
      "Yab-yum with B's ankles crossed behind A's back (full lotus wrap). Maximal joint flexion at hips and knees; requires good adductor and hamstring length.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        {},
        {
          hip_L: { x: 95, y: 40 },
          hip_R: { x: 95, y: -40 },
          knee_L: { x: 125 },
          knee_R: { x: 125 },
          shoulder_L: { x: 35, y: 35 },
          shoulder_R: { x: 35, y: -35 },
          elbow_L: { x: 70 },
          elbow_R: { x: 70 },
          lumbar: { x: 10 }
        }
      ),
      personB: person(
        [0, 0.36, 0.08],
        { y: 180 },
        {
          hip_L: { x: 115, y: 45 },
          hip_R: { x: 115, y: -45 },
          knee_L: { x: 130 },
          knee_R: { x: 130 },
          shoulder_L: { x: 60, y: 45 },
          shoulder_R: { x: 60, y: -45 },
          elbow_L: { x: 100 },
          elbow_R: { x: 100 },
          lumbar: { x: 10 }
        }
      )
    }
  },

  {
    id: 'seated-rear-lap',
    name: 'Reverse lap (seated rear)',
    category: 'intermediate',
    tags: ['same-direction', 'seated', 'rear-entry'],
    summary:
      "Partner A seated upright on the floor or chair; partner B sits in A's lap facing away. Same-direction pelvic stack; rear access with vertical alignment.",
    scene: {
      personA: person(
        [0, 0.32, 0],
        {},
        {
          hip_L: { x: 90, y: 25 },
          hip_R: { x: 90, y: -25 },
          knee_L: { x: 75 },
          knee_R: { x: 75 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      ),
      personB: person(
        [0, 0.42, 0.10],
        {},
        {
          hip_L: { x: 90, y: 20 },
          hip_R: { x: 90, y: -20 },
          knee_L: { x: 100 },
          knee_R: { x: 100 },
          lumbar: { x: -5 }
        }
      )
    }
  },

  {
    id: 'kneeling-rear',
    name: 'Upright kneeling rear',
    category: 'intermediate',
    tags: ['same-direction', 'kneeling', 'rear-entry'],
    summary:
      'Both kneeling upright in tandem (A in front, B behind). Pelvises vertical and same-facing; B can lean forward to alter contact angle without quadruped support.',
    scene: {
      personA: person(
        [0, 0.50, 0],
        {},
        {
          hip_L: { x: 0, y: 15 },
          hip_R: { x: 0, y: -15 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 30, y: 60 },
          shoulder_R: { x: 30, y: -60 },
          elbow_L: { x: 40 },
          elbow_R: { x: 40 },
          lumbar: { x: -10 }
        }
      ),
      personB: person(
        [0, 0.50, -0.12],
        {},
        {
          hip_L: { x: 0, y: 15 },
          hip_R: { x: 0, y: -15 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      )
    }
  },

  {
    id: 'kneel-and-stand',
    name: 'Kneel-and-stand (T)',
    category: 'intermediate',
    tags: ['mixed-stance', 'asymmetric', 'face-to-face'],
    summary:
      "Partner A kneeling upright; partner B standing in front of A, A's face at hip height. Asymmetric vertical configuration commonly used for oral contact.",
    scene: {
      personA: person(
        [0, 0.50, 0],
        {},
        {
          hip_L: { x: 0, y: 10 },
          hip_R: { x: 0, y: -10 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 45, y: 30 },
          shoulder_R: { x: 45, y: -30 },
          elbow_L: { x: 50 },
          elbow_R: { x: 50 }
        }
      ),
      personB: person(
        [0, 0.95, 0.15],
        { y: 180 },
        {
          hip_L: { x: 0, y: 10 },
          hip_R: { x: 0, y: -10 },
          knee_L: { x: 0 },
          knee_R: { x: 0 },
          shoulder_L: { x: 20, y: 15 },
          shoulder_R: { x: 20, y: -15 },
          elbow_L: { x: 20 },
          elbow_R: { x: 20 }
        }
      )
    }
  },

  {
    id: 'leapfrog',
    name: 'Leapfrog',
    category: 'intermediate',
    tags: ['same-direction', 'kneeling', 'rear-entry'],
    summary:
      "Variant of doggy with partner A's torso lowered to forearms (or pillow), increasing lumbar curvature and reducing shoulder load. B kneels upright behind.",
    scene: {
      personA: person(
        [0, 0.40, 0],
        { x: -45 },
        {
          hip_L: { x: 95, y: 20 },
          hip_R: { x: 95, y: -20 },
          knee_L: { x: 100 },
          knee_R: { x: 100 },
          shoulder_L: { x: 130, y: 30 },
          shoulder_R: { x: 130, y: -30 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 },
          lumbar: { x: -25 }
        }
      ),
      personB: person(
        [0, 0.50, -0.25],
        {},
        {
          hip_L: { x: 80, y: 20 },
          hip_R: { x: 80, y: -20 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 }
        }
      )
    }
  },

  {
    id: 'folded-deck-chair',
    name: 'Folded (deck-chair)',
    category: 'intermediate',
    tags: ['face-to-face', 'deep-flexion', 'partner-on-top'],
    summary:
      "Partner A supine with knees folded toward chest; partner B kneels between A's legs, leaning forward over A. Maximizes hip flexion and shortens functional torso distance.",
    scene: {
      personA: person(
        [0, 0.22, 0],
        { x: -100 },
        {
          hip_L: { x: 110, y: 25 },
          hip_R: { x: 110, y: -25 },
          knee_L: { x: 120 },
          knee_R: { x: 120 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 },
          elbow_L: { x: 80 },
          elbow_R: { x: 80 }
        }
      ),
      personB: person(
        [0, 0.50, 0],
        { x: -30, y: 180 },
        {
          hip_L: { x: 80, y: 20 },
          hip_R: { x: 80, y: -20 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          shoulder_L: { x: 100, y: 30 },
          shoulder_R: { x: 100, y: -30 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
        }
      )
    }
  },

  {
    id: 'butterfly',
    name: 'Butterfly (edge supine)',
    category: 'intermediate',
    tags: ['face-to-face', 'edge', 'pelvic-elevation'],
    summary:
      "Partner A supine on the edge of a bed with pelvis elevated; partner B standing or kneeling, holding A's lifted legs. Hip flexion shifts to A; B's lumbar stays neutral.",
    scene: {
      personA: person(
        [0, 0.55, 0],
        { x: -110 },
        {
          hip_L: { x: 100, y: 30 },
          hip_R: { x: 100, y: -30 },
          knee_L: { x: 30 },
          knee_R: { x: 30 },
          shoulder_L: { x: 40, y: 50 },
          shoulder_R: { x: 40, y: -50 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.95, 0.12],
        { y: 180 },
        {
          hip_L: { x: 5, y: 10 },
          hip_R: { x: 5, y: -10 },
          knee_L: { x: 5 },
          knee_R: { x: 5 },
          shoulder_L: { x: 90, y: 25 },
          shoulder_R: { x: 90, y: -25 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
        }
      )
    }
  },

  {
    id: 'bridge',
    name: 'Bridge',
    category: 'intermediate',
    tags: ['face-to-face', 'arched', 'isometric'],
    summary:
      "Partner A in a gluteal bridge (supine with hips lifted, supported by feet and shoulders); partner B kneels between A's legs. Isometric load on A's posterior chain.",
    scene: {
      personA: person(
        [0, 0.45, 0],
        { x: -120 },
        {
          hip_L: { x: 10, y: 25 },
          hip_R: { x: 10, y: -25 },
          knee_L: { x: 90 },
          knee_R: { x: 90 },
          shoulder_L: { x: 0, y: 30 },
          shoulder_R: { x: 0, y: -30 },
          lumbar: { x: -25 }
        }
      ),
      personB: person(
        [0, 0.50, 0.05],
        { y: 180 },
        {
          hip_L: { x: 95, y: 25 },
          hip_R: { x: 95, y: -25 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 }
        }
      )
    }
  },

  {
    id: 'crab',
    name: 'Crab (reverse bridge)',
    category: 'intermediate',
    tags: ['face-to-face', 'arched', 'inverted-base'],
    summary:
      "Partner A in a reverse plank (supine, hands and feet on the floor, hips lifted); partner B kneels facing A. Demands significant shoulder extension from A.",
    scene: {
      personA: person(
        [0, 0.55, 0],
        { x: -120 },
        {
          hip_L: { x: 5, y: 25 },
          hip_R: { x: 5, y: -25 },
          knee_L: { x: 85 },
          knee_R: { x: 85 },
          shoulder_L: { x: -45, y: 25 },
          shoulder_R: { x: -45, y: -25 },
          elbow_L: { x: 10 },
          elbow_R: { x: 10 },
          lumbar: { x: -25 }
        }
      ),
      personB: person(
        [0, 0.55, 0.10],
        { y: 180 },
        {
          hip_L: { x: 95, y: 25 },
          hip_R: { x: 95, y: -25 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 }
        }
      )
    }
  },

  // ─── Advanced: standing / inverted / load-bearing ────────────────────────
  {
    id: 'standing-face-to-face',
    name: 'Standing carry',
    category: 'advanced',
    tags: ['standing', 'face-to-face', 'load-bearing'],
    summary:
      "Partner A standing, supporting partner B who is carried with legs wrapped around A's waist. High load on A's lumbar and quadriceps; usually wall-assisted.",
    scene: {
      personA: person(
        [0, 0.95, 0],
        {},
        {
          hip_L: { x: 15, y: 15 },
          hip_R: { x: 15, y: -15 },
          knee_L: { x: 25 },
          knee_R: { x: 25 },
          shoulder_L: { x: 30, y: 40 },
          shoulder_R: { x: 30, y: -40 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 },
          lumbar: { x: 10 }
        }
      ),
      personB: person(
        [0, 0.95, 0.12],
        { x: -30, y: 180 },
        {
          hip_L: { x: 100, y: 35 },
          hip_R: { x: 100, y: -35 },
          knee_L: { x: 110 },
          knee_R: { x: 110 },
          shoulder_L: { x: 130, y: 30 },
          shoulder_R: { x: 130, y: -30 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 }
        }
      )
    }
  },

  {
    id: 'standing-rear',
    name: 'Standing rear (braced)',
    category: 'advanced',
    tags: ['standing', 'same-direction', 'rear-entry'],
    summary:
      "Both standing; partner A bent 60° at the hips, hands braced on a wall or surface. Partner B stands behind in a slight squat. Same-direction stack at standing height.",
    scene: {
      personA: person(
        [0, 0.85, 0],
        { x: -60 },
        {
          hip_L: { x: 70, y: 15 },
          hip_R: { x: 70, y: -15 },
          knee_L: { x: 15 },
          knee_R: { x: 15 },
          shoulder_L: { x: 130, y: 30 },
          shoulder_R: { x: 130, y: -30 },
          elbow_L: { x: 10 },
          elbow_R: { x: 10 }
        }
      ),
      personB: person(
        [0, 0.85, -0.20],
        { x: -10 },
        {
          hip_L: { x: 30, y: 15 },
          hip_R: { x: 30, y: -15 },
          knee_L: { x: 40 },
          knee_R: { x: 40 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 },
          elbow_L: { x: 30 },
          elbow_R: { x: 30 }
        }
      )
    }
  },

  {
    id: 'bent-over-table',
    name: 'Bent-over-table',
    category: 'advanced',
    tags: ['standing', 'same-direction', 'support'],
    summary:
      "Partner A bent 90° at the hips over a table or counter, torso fully supported. Partner B standing behind. Removes the lumbar load that standing-rear places on A.",
    scene: {
      personA: person(
        [0, 0.95, 0],
        { x: -90 },
        {
          hip_L: { x: 90, y: 15 },
          hip_R: { x: 90, y: -15 },
          knee_L: { x: 5 },
          knee_R: { x: 5 },
          shoulder_L: { x: 130, y: 30 },
          shoulder_R: { x: 130, y: -30 },
          elbow_L: { x: 20 },
          elbow_R: { x: 20 }
        }
      ),
      personB: person(
        [0, 0.95, -0.20],
        {},
        {
          hip_L: { x: 15, y: 15 },
          hip_R: { x: 15, y: -15 },
          knee_L: { x: 20 },
          knee_R: { x: 20 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      )
    }
  },

  {
    id: 'wheelbarrow',
    name: 'Wheelbarrow',
    category: 'advanced',
    tags: ['standing', 'inverted', 'load-bearing'],
    summary:
      "Partner B inverted with hands on the floor (semi-handstand); partner A standing, supporting B's hips. Significant shoulder/wrist load on B; A bears B's leg weight.",
    scene: {
      personA: person(
        [0, 0.95, 0],
        {},
        {
          hip_L: { x: 15, y: 15 },
          hip_R: { x: 15, y: -15 },
          knee_L: { x: 25 },
          knee_R: { x: 25 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 }
        }
      ),
      personB: person(
        [0, 0.85, 0.15],
        { x: 30, y: 180 },
        {
          hip_L: { x: 60, y: 25 },
          hip_R: { x: 60, y: -25 },
          knee_L: { x: 80 },
          knee_R: { x: 80 },
          shoulder_L: { x: 170, y: 20 },
          shoulder_R: { x: 170, y: -20 },
          elbow_L: { x: 10 },
          elbow_R: { x: 10 }
        }
      )
    }
  },

  {
    id: 'amazon',
    name: 'Amazon (deep squat over)',
    category: 'advanced',
    tags: ['face-to-face', 'partner-on-top', 'deep-flexion'],
    summary:
      "Partner A supine with legs pulled toward chest; partner B in a deep squat above A, weight on the feet. Maximum hip flexion on both; demands ankle dorsiflexion from B.",
    scene: {
      personA: person(
        [0, 0.18, 0],
        { x: -90 },
        {
          hip_L: { x: 120, y: 25 },
          hip_R: { x: 120, y: -25 },
          knee_L: { x: 60 },
          knee_R: { x: 60 },
          shoulder_L: { x: 40, y: 60 },
          shoulder_R: { x: 40, y: -60 },
          elbow_L: { x: 60 },
          elbow_R: { x: 60 }
        }
      ),
      personB: person(
        [0, 0.40, 0.05],
        { y: 180 },
        {
          hip_L: { x: 120, y: 40 },
          hip_R: { x: 120, y: -40 },
          knee_L: { x: 130 },
          knee_R: { x: 130 },
          ankle_L: { x: 25 },
          ankle_R: { x: 25 },
          lumbar: { x: -10 }
        }
      )
    }
  },

  {
    id: 'piledriver',
    name: 'Inverted (shoulder-stand)',
    category: 'advanced',
    tags: ['inverted', 'face-to-face', 'high-risk'],
    summary:
      "Partner A in a partial shoulder-stand (supine, hips lifted overhead, weight on upper back); partner B kneels or stands above. Compresses A's cervical spine — significant injury risk; included for completeness as the geometric extreme of pelvic elevation.",
    scene: {
      personA: person(
        [0, 0.85, 0],
        { x: -150 },
        {
          hip_L: { x: 30, y: 25 },
          hip_R: { x: 30, y: -25 },
          knee_L: { x: 60 },
          knee_R: { x: 60 },
          shoulder_L: { x: -30, y: 20 },
          shoulder_R: { x: -30, y: -20 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 },
          lumbar: { x: -25 }
        }
      ),
      personB: person(
        [0, 0.95, 0],
        { y: 180 },
        {
          hip_L: { x: 30, y: 15 },
          hip_R: { x: 30, y: -15 },
          knee_L: { x: 40 },
          knee_R: { x: 40 },
          shoulder_L: { x: 40, y: 30 },
          shoulder_R: { x: 40, y: -30 }
        }
      )
    }
  },

  {
    id: 'sphinx',
    name: 'Sphinx prone-lift',
    category: 'advanced',
    tags: ['prone', 'arched', 'same-direction'],
    summary:
      "Partner A prone but propped on the forearms (sphinx pose) with strong lumbar extension; partner B kneels behind. Increases A's pelvic angle from the prone baseline.",
    scene: {
      personA: person(
        [0, 0.20, 0],
        { x: 60 },
        {
          hip_L: { x: 5, y: 15 },
          hip_R: { x: 5, y: -15 },
          knee_L: { x: 10 },
          knee_R: { x: 10 },
          shoulder_L: { x: 100, y: 40 },
          shoulder_R: { x: 100, y: -40 },
          elbow_L: { x: 90 },
          elbow_R: { x: 90 },
          lumbar: { x: -30 }
        }
      ),
      personB: person(
        [0, 0.50, -0.10],
        { x: -15 },
        {
          hip_L: { x: 90, y: 25 },
          hip_R: { x: 90, y: -25 },
          knee_L: { x: 95 },
          knee_R: { x: 95 },
          shoulder_L: { x: 30, y: 30 },
          shoulder_R: { x: 30, y: -30 }
        }
      )
    }
  }
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id);
}

/** All unique tags across the preset library, alphabetised. */
export function allTags(): string[] {
  const s = new Set<string>();
  for (const p of PRESETS) for (const t of p.tags) s.add(t);
  return [...s].sort();
}
