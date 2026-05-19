# wellness-app

A parametric 3D biomechanics simulator + pose preset library + per-session
log, deployed as a static site to GitHub Pages.

Source lives in [`wellness-app/`](./wellness-app). The legacy WatchGPTVoice
prototype that used to live at the repo root has been removed; if you need
it, look in `git log` before commit `458ba0f`.

## Local dev

```bash
cd wellness-app/frontend
npm install
npm run dev
```

## Deploy

Pushes to `main` or the active feature branch trigger
[`.github/workflows/deploy-wellness-app.yml`](.github/workflows/deploy-wellness-app.yml),
which builds `wellness-app/frontend` and publishes to GitHub Pages.
