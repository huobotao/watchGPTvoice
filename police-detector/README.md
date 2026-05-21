# police-detector

Detect parking enforcement officers (and, secondarily, marked police vehicles)
from a dashcam / phone camera feed and surface an alert. Designed to run on a
laptop, a Raspberry Pi car appliance, or an iPhone — and to batch-analyze
TeslaCam SD card recordings offline.

> **MVP first**: the smallest thing that runs is `apps/desktop/peo_demo.py`
> with `--self-test`. It's a pure-OpenCV hi-vis vest detector — no YOLO, no
> torch, no dataset. Boots in seconds. See "Quick MVP" below.

## Quick MVP

```bash
cd police-detector
pip install opencv-python-headless numpy scipy pydantic   # ~30s
python apps/desktop/peo_demo.py --self-test --save /tmp/peo.mp4 \
    --save-frame /tmp/peo.png --headless --max-frames 90
# → /tmp/peo.png shows a green bbox around a hi-vis-vested figure
#   with a red "Parking enforcement nearby" banner.
```

Then point it at real footage:

```bash
python apps/desktop/peo_demo.py --source path/to/street.mp4
python apps/desktop/peo_demo.py --source 0   # webcam
```

The MVP is intentionally a hi-vis-vest detector (HSV mask + geometric
filters). It will fire on construction workers and crossing guards too —
that's fine for proving the loop. Phase 2 swaps in a YOLO person+vest
detector for precision. Phase 3 adds GPS context to suppress non-PEO
hi-vis (you're not in a parking zone, ignore).

> **Tesla note:** Tesla Fleet API does **not** expose live camera frames to
> third parties, so we cannot run real-time inference on the Tesla's own
> screen. The only supported Tesla touchpoint is the offline TeslaCam batch
> tool (`apps/teslacam/`). For live detection use a phone, dashcam + Pi, or
> laptop.

## What it does

For every frame from the chosen source it:

1. Runs a YOLO model and keeps only police-vehicle and parking-enforcement
   classes.
2. Tracks each instance across frames with ByteTrack (built into Ultralytics).
3. Per track:
   - Estimates **approach state** (`approaching` / `receding` / `stationary`)
     from the bounding-box growth rate.
   - Detects **flashing lights** by HSV-masking red/blue inside the top of the
     bbox and counting peaks in the mask area over a 1.5s window.
4. Emits one of these events to the registered sinks:
   `police_seen` · `police_approaching` · `police_flashing` ·
   `police_approaching_flashing` · `peo_seen`.
5. Sinks:
   - `CV2WindowSink` — bounding boxes, status labels, top banner on alert.
   - `AudioAlertSink` — short beep (informational) or two-tone alarm
     (`approaching` / `flashing`). 5s cooldown per event kind.
   - `CSVLogSink` — append every event for offline analysis.

## Quick start

```bash
cd police-detector
pip install -r requirements.txt
python scripts/make_beeps.py           # one-time: generate alert wavs
python scripts/download_weights.py     # fetch a community police-car YOLO

# Run on a clip:
python apps/desktop/run.py --source tests/fixtures/your_clip.mp4

# Or on your webcam:
python apps/desktop/run.py --source 0

# TeslaCam SD card batch:
python apps/teslacam/batch.py --indir /Volumes/TESLACAM/TeslaCam --outdir ./out

# Raspberry Pi (after exporting NCNN):
python scripts/export_ncnn.py
python apps/rpi/service.py
```

If `download_weights.py` can't reach the upstream releases (network restricted
in your environment), the detector falls back to a generic COCO YOLO and shows
generic `car`/`truck` boxes — useful for verifying the pipeline before you
have the real weights. Drop your own `.pt` at `models/police_yolov11n.pt` to
override.

## Architecture

```
core/
  detector.py     PoliceDetector — wraps Ultralytics YOLO
  tracker.py      Tracker        — keeps a Track per track_id from ByteTrack
  approach.py     ApproachEstimator — log-width regression over a sliding window
  lights.py       FlashDetector   — HSV mask + peak count
  alerter.py      AlertSink protocol + CV2WindowSink, AudioAlertSink, CSVLogSink
  pipeline.py     Pipeline       — orchestrates one frame through the stack
apps/
  desktop/run.py  OpenCV demo
  teslacam/batch.py  Offline TeslaCam analyzer (annotated mp4 + sightings.csv)
  rpi/service.py     Headless Pi service (Picamera2 / USB cam + HDMI screen)
  ios/               SwiftUI source files (drop into a fresh Xcode project)
data/peo/         PEO fine-tune dataset stub + recipe
scripts/          download_weights, make_beeps, export_coreml, export_ncnn
tests/            pytest — algorithmic + end-to-end synthetic
```

All front-ends share `core/`. Adding a new front-end (e.g. RTSP-from-Frigate)
means writing a thin wrapper that builds a `Pipeline` with the sinks you want.

## Tunable knobs

See `core/config.py` — pydantic `Config` model. Override via:

```python
from core import default_config
cfg = default_config().model_copy(update={
    "confidence_threshold": 0.6,
    "approach_growth_threshold": 0.03,
    "alert_cooldown_seconds": 8.0,
})
```

Important ones:

| field | default | purpose |
|-------|---------|---------|
| `confidence_threshold` | 0.55 | reject low-confidence detections |
| `approach_growth_threshold` | 0.02 | fractional bbox-width growth/s to count as "approaching" |
| `approach_hysteresis` | 0.005 | avoid label flapping |
| `flash_window_frames` | 45 | ~1.5 s at 30 fps |
| `flash_min_peaks` | 2 | peaks within window to flag flashing |
| `alert_cooldown_seconds` | 5.0 | min seconds between audio alerts of same kind |

## Tests

```bash
python -m pytest tests/ -v
```

Tests cover the algorithmic pieces (approach, flash, audio cooldown, CSV) plus
an end-to-end synthetic frame run that exercises the full pipeline without
needing the real YOLO model installed.

## Roadmap

- [x] Phase 1: desktop MVP (detection + audio + window)
- [x] Phase 2: tracking + approach
- [x] Phase 3: flashing-lights classifier
- [x] Phase 4: TeslaCam offline batch
- [x] Phase 5: Raspberry Pi service (NCNN export + systemd unit)
- [~] Phase 6: iOS app (Swift sources scaffolded; needs an Xcode project + a
       device build)
- [~] Phase 7: PEO vehicle fine-tune (dataset recipe documented; data
       collection is the bulk of the work)

## Reuse credits

We don't train a police-car model from scratch; we reuse existing community
weights:

- [`atcode11/Real-Time-Detection-of-Vehicle-Types-using-Yolo`](https://github.com/atcode11/Real-Time-Detection-of-Vehicle-Types-using-Yolo)
  — Police Cars / Ambulance / Fire trucks / mail trucks.
- [`dynle/japanese-emergency-vehicles-detection`](https://github.com/dynle/japanese-emergency-vehicles-detection)
  — YOLOv7-tiny tuned for JP markings; 97.6% mAP @ 47 FPS.
- [`SiddiAvinashM10/Emergency-Vehicle-Classification-YOLO`](https://github.com/SiddiAvinashM10/Emergency-Vehicle-Classification-YOLO).
- [`connervieira/Predator`](https://github.com/connervieira/Predator) —
  general dashcam platform; great inspiration for the alert UX.
- [`teslamotors/dashcam`](https://github.com/teslamotors/dashcam) — official
  TeslaCam metadata reader (we vendor the parser, not the whole repo).

Tracking is `bytetrack.yaml` shipped with Ultralytics.

## Safety / legal

- Use as a **passenger**. Don't poke the screen while driving.
- US: dashcam recording is generally legal. Two-party-consent states (e.g.
  California, Massachusetts) restrict **audio** recording — leave the mic off.
- EU: several countries (Germany, Austria) have purpose-bound retention rules
  and may require an in-car notice. Default config does not record audio.
- The tool is for **driver awareness**, not for evading law enforcement. Don't
  rely on it for that, and don't ship it framed that way.

## Non-goals

Live integration with Tesla's screens (impossible per current API). ALPR /
license-plate hotlists (Predator already does this — point users there).
Cloud sync. Multi-camera fusion. On-device retraining.
