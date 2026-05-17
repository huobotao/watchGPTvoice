# Biomechanics notes

Joint ranges used in `src/simulator/core/skeleton.ts` are approximate adult
averages derived from orthopaedic and kinesiology references. They are
deliberately conservative for interactive use — real human variability is
larger, but accepting unconstrained input quickly produces poses that look
broken (e.g. hyperextended knees, 360° shoulders).

## Coordinate convention

- World axes: **+Y up, +Z forward, right-handed**.
- Joint Euler order: **XYZ extrinsic**, expressed in degrees.
  - `x` = flexion / extension (sagittal pitch)
  - `y` = abduction / adduction (frontal yaw) where applicable
  - `z` = axial rotation (transverse roll)

## Joint limits (per side; the opposite side mirrors `y`)

| Joint | x (flexion) | y (abduction) | z (rotation) |
| --- | --- | --- | --- |
| Lumbar spine | −30 … 90 | −30 … 30 | −45 … 45 |
| Thoracic spine | −20 … 40 | −25 … 25 | −30 … 30 |
| Neck | −45 … 60 | −45 … 45 | −80 … 80 |
| Head | −30 … 30 | — | — |
| Shoulder | −60 … 180 | 0 … 180 | −90 … 90 |
| Elbow | 0 … 145 | — | — |
| Wrist | −70 … 70 | −25 … 35 | — |
| Hip | −20 … 120 | −30 … 45 | −45 … 45 |
| Knee | 0 … 135 | — | — |
| Ankle | −40 … 30 | −25 … 20 | — |

## Derived metrics

Computed in `src/simulator/core/metrics.ts`:

- **`pelvicDistance`** — Euclidean distance between pelvis centres.
- **`pelvicYawDelta`** — angle between the two pelvis facing-axes, folded
  into `[0°, 180°]`. 0° = directly opposed, 180° = same direction.
- **`pelvicPitchDelta`** — difference of pelvic pitch about the world
  horizontal.
- **`contactAxis`** — unit vector from pelvis A to pelvis B.
- **`engagementDepth`** — signed projection of (pelvis B − pelvis A) onto
  pelvis A's local +Z. Positive when B is in front of A.
- **`supportPointsA/B`** — count of joints (ankles, wrists) within
  `GROUND_Y_THRESHOLD = 8 cm` of the ground plane, plus pelvis if it is
  near the ground. Coarse stability proxy.
- **`stabilityA/B`** — `min(supports / 3, 1)`, used to flag postures that
  need external support.

## Forward kinematics

Each joint defines a translation offset from its parent (in skeleton-height
units) and a local Euler rotation. `resolvePose` walks the joint hierarchy
and accumulates world transforms via `Matrix4`. The pelvis is a synthetic
root that carries the person's world pose; `hip_L`, `hip_R`, and the spine
chain all attach to it.

## Open questions

- Should the IK solver respect joint torque limits, not just angular
  ranges? (Planned for V1 once CCD-IK is integrated.)
- Should `engagementDepth` be replaced by a centreline-projected metric
  using the centroids of pelvic blocks rather than pelvis origins? Likely
  yes once mannequin geometry stabilizes.
