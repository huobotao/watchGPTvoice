"""Desktop demo: open a video source, run the police-detection pipeline, and
render an OpenCV window with bounding boxes + an audible alert.

Usage:
    python apps/desktop/run.py --source path/to/clip.mp4
    python apps/desktop/run.py --source 0           # default webcam
    python apps/desktop/run.py --source rtsp://...
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Allow running this file directly without installing the package.
ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core import (  # noqa: E402
    AudioAlertSink,
    CSVLogSink,
    CV2WindowSink,
    Pipeline,
    PoliceDetector,
    default_config,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Police detection desktop demo")
    p.add_argument("--source", required=True, help="Video file path, webcam index, or RTSP/HTTP url")
    p.add_argument("--weights", default=None, help="Override path to YOLO .pt weights")
    p.add_argument("--no-audio", action="store_true", help="Disable audio alerts")
    p.add_argument("--csv", default=None, help="Optional path to log events as CSV")
    p.add_argument("--window-title", default="Police Detector")
    p.add_argument("--save", default=None, help="Optional output MP4 path to write annotated frames")
    p.add_argument("--headless", action="store_true", help="Don't open a window (still saves/csv)")
    return p.parse_args()


def _open_capture(source: str):
    import cv2

    if source.isdigit():
        return cv2.VideoCapture(int(source))
    return cv2.VideoCapture(source)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    cfg = default_config()

    import cv2

    cap = _open_capture(args.source)
    if not cap.isOpened():
        print(f"ERROR: could not open source {args.source!r}", file=sys.stderr)
        return 2

    detector = PoliceDetector(cfg, weights_path=args.weights)
    sinks = [CV2WindowSink(cfg)]
    if not args.no_audio:
        sinks.append(AudioAlertSink(cfg))
    if args.csv:
        sinks.append(CSVLogSink(args.csv))

    pipeline = Pipeline(cfg, detector=detector, sinks=sinks)

    writer = None
    if args.save:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        writer = cv2.VideoWriter(args.save, fourcc, fps, (w, h))

    if not args.headless:
        cv2.namedWindow(args.window_title, cv2.WINDOW_NORMAL)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            out, events = pipeline.step(frame)
            if writer is not None:
                writer.write(out)
            if not args.headless:
                cv2.imshow(args.window_title, out)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break
    finally:
        cap.release()
        if writer is not None:
            writer.release()
        if not args.headless:
            cv2.destroyAllWindows()
        pipeline.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
