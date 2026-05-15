"""Raspberry Pi headless-ish service.

Differences from the desktop demo:
  - Tries to use a Picamera2 source if available (Pi Camera Module), else falls
    back to USB webcam at /dev/video0.
  - Uses an NCNN model if `models/police_yolov11n_ncnn_model/` exists (much
    faster on Pi 5 CPU than the .pt). Run scripts/export_ncnn.py to produce it.
  - Logs status to syslog/journald in addition to drawing on the HDMI screen.

Install as a systemd user service using apps/rpi/police-detector.service.
"""

from __future__ import annotations

import argparse
import logging
import logging.handlers
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core import AudioAlertSink, CV2WindowSink, Pipeline, PoliceDetector, default_config  # noqa: E402

log = logging.getLogger("rpi.service")


def _setup_logging() -> None:
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    root.addHandler(sh)
    try:
        jh = logging.handlers.SysLogHandler(address="/dev/log")
        jh.setFormatter(fmt)
        root.addHandler(jh)
    except (FileNotFoundError, PermissionError):
        pass


def _open_pi_source(prefer_picamera: bool):
    """Return a callable that yields BGR frames, plus a teardown."""
    import cv2

    if prefer_picamera:
        try:
            from picamera2 import Picamera2  # type: ignore

            picam = Picamera2()
            picam.configure(picam.create_preview_configuration(main={"format": "BGR888", "size": (1280, 720)}))
            picam.start()
            log.info("Using Picamera2")

            def read():
                return True, picam.capture_array()

            def release():
                picam.stop()

            return read, release
        except Exception as e:
            log.info("Picamera2 not available (%s); falling back to /dev/video0", e)

    cap = cv2.VideoCapture(0)
    return (lambda: cap.read()), (lambda: cap.release())


def main() -> int:
    _setup_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-picamera", action="store_true", help="Skip Picamera2 even if installed")
    parser.add_argument("--no-audio", action="store_true")
    parser.add_argument("--no-window", action="store_true", help="Run truly headless (no cv2.imshow)")
    args = parser.parse_args()

    cfg = default_config()
    # Prefer NCNN export if present (Pi 5 CPU runs YOLO via NCNN much faster).
    ncnn_dir = Path(cfg.resolve("models/police_yolov11n_ncnn_model"))
    weights = str(ncnn_dir) if ncnn_dir.exists() else None
    detector = PoliceDetector(cfg, weights_path=weights)
    sinks = [CV2WindowSink(cfg)]
    if not args.no_audio:
        sinks.append(AudioAlertSink(cfg))
    pipeline = Pipeline(cfg, detector=detector, sinks=sinks)

    import cv2

    read, release = _open_pi_source(prefer_picamera=not args.no_picamera)
    if not args.no_window:
        cv2.namedWindow("police-detector", cv2.WND_PROP_FULLSCREEN)
        cv2.setWindowProperty("police-detector", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    fps_t = time.time()
    fps_count = 0
    try:
        while True:
            ok, frame = read()
            if not ok:
                log.warning("frame read failed; sleeping 0.2s")
                time.sleep(0.2)
                continue
            out, _ = pipeline.step(frame)
            fps_count += 1
            now = time.time()
            if now - fps_t >= 5.0:
                log.info("FPS ~ %.1f", fps_count / (now - fps_t))
                fps_t = now
                fps_count = 0
            if not args.no_window:
                cv2.imshow("police-detector", out)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
    finally:
        release()
        if not args.no_window:
            cv2.destroyAllWindows()
        pipeline.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
