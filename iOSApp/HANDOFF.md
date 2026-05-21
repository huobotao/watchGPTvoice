# Handoff to Next AI / Developer

## TL;DR

You're picking up an iPhone app project. The web app is **done and live**. The
native iOS wrapper is a minimal WKWebView shell. The next milestones are
**Dynamic Island Live Activity** and **Home Screen Widget**, both of which need
real native SwiftUI/Swift work (the WebView shell can't do them).

## Repo Layout

```
watchGPTvoice/
├── sunrise-sunset.html       ← the entire web app, single file ~30 KB
├── iOSApp/
│   ├── SunriseSunset.xcodeproj/
│   ├── SunriseSunset/
│   │   ├── SunriseSunsetApp.swift   ← @main entry
│   │   ├── ContentView.swift        ← loads either remote URL or bundled HTML
│   │   ├── WebView.swift            ← WKWebView + CoreLocation auth
│   │   └── Assets.xcassets/
│   └── README.md                    ← Mac-side setup steps
└── .github/workflows/pages.yml      ← deploys sunrise-sunset.html to GitHub Pages
```

Live URL of the web app: https://huobotao.github.io/watchGPTvoice/sunrise-sunset.html

## What the Web App Already Does

Everything sun/sky related is fully implemented in pure JS in
`sunrise-sunset.html`:

- Geolocation + 3-minute auto-refresh
- Reverse geocoding via Nominatim (English address, abbreviated states)
- Live ticking clock (HH:MM:SS), distance from now to seconds precision
- Four altitude thresholds for sunrise/sunset: astronomical (-18°), nautical
  (-12°), civil (-6°), horizon (-0.833° including refraction)
- "Currently in progress" group on top, sorted by which event arrives first
- Current twilight sub-phase + overall progress bar + in-row segment bar
- Day/night progress % when in plain day or night
- Sun altitude + per-minute rate + rate as % of today's max
- Three.js + OrbitControls 3D draggable trajectory (future portion red with
  motion arrow, past portion gold, below-horizon dashed-dim)
- Idealized clear-sky illuminance curve (Kasten-Young air mass + Bouguer
  transmittance, twilight piecewise) with current % of 24h max
- Temperature curve via Open-Meteo (free, no key) with toggle: lux only /
  temp only / both overlaid
- Solar math is a port of SunCalc by Vladimir Agafonkin (BSD-2-Clause).

## What the Native Wrapper Does

Almost nothing yet:

- `SunriseSunsetApp.swift`: standard SwiftUI `@main` App
- `ContentView.swift`: shows `WebView` pointing at the live GitHub Pages URL
  (constant `remoteURL`). Set to `nil` to fall back to bundled HTML if added.
- `WebView.swift`: WKWebView with `CLLocationManager.requestWhenInUseAuthorization()`
  triggered eagerly so the JS `navigator.geolocation` call inside the WebView
  inherits the app's location permission. Targets iOS 17.

Build settings worth knowing:
- Bundle id: `com.example.SunriseSunset` (user will change to their own)
- Display name: `日出日落`
- `NSLocationWhenInUseUsageDescription` is set via INFOPLIST_KEY in pbxproj
  (no separate Info.plist file)
- Deployment target: iOS 17.0

## Next Milestones the User Wants

### 1. Dynamic Island Live Activity

Show a Live Activity on the Dynamic Island that updates as you approach the
next sunrise/sunset. Suggested content:

- **Compact**: a small sun glyph + countdown ("13m" until next horizon event)
- **Expanded**: sunrise/sunset times, current twilight phase, % progress
- **Minimal**: just the sun glyph colored by phase

Implementation hints:

- Needs a new **Widget Extension target** added in Xcode
- Use **ActivityKit** (`ActivityAttributes`, `ActivityContent`, `Activity.request`)
- Live Activity push updates can come from APNs (requires paid Apple Developer
  Program) or from the app itself while it's running. Background updates need
  Background Modes capability.
- Most of the "what's the next event time" logic should be ported from the JS
  to Swift, or computed once and passed in. The SunCalc port to Swift is small
  (~80 lines) — recommend porting rather than running JS server-side.

### 2. Home Screen Widget

A widget showing today's sunrise/sunset times plus a mini version of the sky
chart. Sizes:

- Small: just the next event time + countdown
- Medium: full sunrise + sunset times, current twilight phase indicator
- Large: include the 24h illuminance curve thumbnail

Implementation hints:

- Same Widget Extension target as the Live Activity above (one extension can
  host both)
- Use **WidgetKit** (`TimelineProvider`, `TimelineEntry`, `Widget` struct)
- Compute a timeline of entries at sunrise/sunset/twilight transitions for
  the next ~24 hours; WidgetKit will re-render at each entry's date.
- For the small mini-chart, draw with SwiftUI `Canvas` — same math as the JS
  but rendered natively.

### 3. Optional: Replace WebView with Native SwiftUI

The current WebView shell is fine for the main screen, but if you go full
native:

- Reuse the Swift port of the sun math (you'll write it for the widget anyway)
- Use **SceneKit** or **RealityKit** for the 3D trajectory instead of Three.js
- Use **Swift Charts** for the illuminance/temperature curves
- Use `CLGeocoder` for reverse geocoding (replaces Nominatim, works offline-ish)
- Keep Open-Meteo for temperature (no native alternative without API key)

## Known Caveats / Gotchas

- The `project.pbxproj` was hand-written, not generated by Xcode. It should
  work in Xcode 15+ but if Xcode complains, regenerate by creating a fresh
  iOS App project and copying the Swift files in.
- WKWebView geolocation only works on iOS 15+ when the host app has
  `NSLocationWhenInUseUsageDescription` set AND has actually been granted
  location permission. The app eagerly requests it on launch.
- The web app uses `localStorage` for the last-known location fallback.
  WKWebView keeps this isolated per app, which is what we want.
- Free Apple ID provisioning profiles expire every 7 days. For permanent
  install, paid Developer Program is needed.

## What's Already Pushed

Everything is on the `main` branch of https://github.com/huobotao/watchGPTvoice
GitHub Pages serves the web app via the `pages.yml` workflow on every push to
`main`. So when you change `sunrise-sunset.html` and push, the WebView-based
iOS app picks up the new version automatically — no rebuild needed for web
changes. The Dynamic Island + Widget extensions will need real Xcode builds
of course.
