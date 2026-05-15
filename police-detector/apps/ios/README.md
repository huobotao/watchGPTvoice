# iOS app (Phase 6)

This folder contains Swift source files for the on-device police detector. It is
**not** a complete Xcode project — Xcode insists on generating its own
`.xcodeproj` / `.xcworkspace`. To bring this up:

1. In Xcode, create a new iOS App (SwiftUI lifecycle). Name it `PoliceDetector`.
2. Drag the `.swift` files from this directory into the new project.
3. Run `python ../../scripts/export_coreml.py` from the repo root to produce
   `models/police_yolov11n.mlpackage`. Drag the `.mlpackage` into the Xcode
   project under a new "Models" group; ensure Target Membership is checked.
4. Add an `Info.plist` key `NSCameraUsageDescription` with a user-facing reason.
5. Build & run on a real device (the Simulator doesn't have a rear camera).

**Safety reminder.** Use only as a passenger. The UI is intentionally audio-first;
do not interact with the screen while driving.

## Files

- `CameraView.swift` — SwiftUI view wrapping `AVCaptureSession`, feeds frames to
  a `VisionRunner`.
- `VisionRunner.swift` — wraps `VNCoreMLRequest`, returns parsed detections.
- `ApproachEstimator.swift` — Swift port of `core/approach.py`. Keep numeric
  thresholds in sync via `Config.json`.
- `FlashDetector.swift` — Swift port of `core/lights.py` using `CIFilter` for
  the HSV mask. Same window/peak parameters as the Python side.
- `AlertView.swift` — top banner + sound effect, mirrors `CV2WindowSink`.

## Algorithm parity

To keep the Python and Swift implementations behaviorally identical:

- All thresholds live in `Config.json` (shipped as a resource in both apps).
  Don't hardcode numbers in either platform.
- When you tune a number, change `Config.json` and the Python `Config` default
  in the same commit.
