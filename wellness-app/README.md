# Intimacy Geometry

A parametric 3D simulator for intimate biomechanics, built as a study in
applied kinesiology — a dual-view tool (schematic + anatomical mannequin)
that lets users explore the continuous parameter space of human positioning
rather than browse a discrete catalogue.

> **Status:** MVP scaffold. The simulator runs, five preset poses load, a
> joint parameter panel drives both views in real time, and live geometric
> metrics + auto-annotations appear alongside. Notes / attempt logging is
> stored locally via IndexedDB. Multi-device sync, animation timelines, and
> a curated knowledge base are planned for V1 / V2.

## Design philosophy

- **Parametric, not enumerated.** A pose is a point in a ~30-DOF biomechanical
  parameter space, with named "landmark" presets (missionary, cowgirl, etc.)
  serving as starting points from which to explore neighbouring configurations.
- **Dual-view rendering.** Like CAD's wireframe + shaded views: a schematic
  view exposes angles, axes, and numerical labels for precision; an anatomical
  mannequin view (low-poly bodies, toon shading, no faces or hair) communicates
  spatial reality. Both consume the same underlying skeleton state.
- **Biomechanically grounded.** Joint ranges of motion follow approximate
  adult orthopaedic averages; the renderer flags violations.
- **Educational, not exploitative.** No realistic skin/hair/anatomical
  rendering; the goal is comprehension of mechanics, not reproduction of
  appearance.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite + React 18 + TypeScript |
| 3D | three.js + @react-three/fiber + drei |
| State | Zustand |
| Storage | Dexie (IndexedDB), PocketBase for sync (planned) |
| Styling | Tailwind CSS |
| PWA | vite-plugin-pwa |

## Develop

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc --noEmit && vite build
npm run preview
```

## Repository layout

```
wellness-app/
├── frontend/           # Vite SPA
│   └── src/
│       ├── simulator/  # Skeleton, FK, IK, metrics, presets, renderers
│       ├── components/ # Toolbar, panels, log
│       ├── store/      # Zustand
│       └── data/       # Dexie schema
├── docs/               # Biomechanics + deploy notes (planned)
└── README.md
```

## Roadmap

- **V1:** CCD-IK end-effector drag, ~~30+ presets~~ (✓ 31, with category /
  search filter UI), MDX knowledge base linked to presets, PocketBase sync
  server, deploy to self-hosted VPS.
- **V2:** Soft-tissue contact visualization (Rapier), pose-space 2D map
  (UMAP), animation timeline, Capacitor wrappers for iOS / iPadOS / macOS.

## License

AGPL-3.0-or-later. See [`LICENSE`](./LICENSE).
