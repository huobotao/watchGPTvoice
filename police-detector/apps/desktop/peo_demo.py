"""PEO MVP demo: run the hi-vis-vest detector on a video source.

This is intentionally the *smallest* thing that proves the loop:
    video → vest detection → bounding box + alert banner + CSV.

It uses only OpenCV — no YOLO, no torch, no model download. Run it on:
  - a random street video you find on YouTube (download with yt-dlp first)
  - your webcam (`--source 0`)
  - the synthetic self-test (`--self-test`) which generates frames on the fly
    and is useful for validating the install before you point it at real video

Once this proves the product idea, swap HiVisDetector → a YOLO person+vest
detector for better precision.
"""

from __future__ import annotations

import argparse
import logging
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core import (  # noqa: E402
    AudioAlertSink,
    CSVLogSink,
    CV2WindowSink,
    HiVisDetector,
    Pipeline,
    default_config,
)


def _synthetic_frame(frame_idx: int, w: int = 640, h: int = 360) -> np.ndarray:
    """Render a fake street scene: gray pavement + a person-shaped hi-vis blob
    that walks across the frame. Used for the self-test."""
    img = np.full((h, w, 3), 95, dtype=np.uint8)
    # Sidewalk strip across the top half.
    img[: h // 2, :] = (120, 120, 120)
    # Animate a hi-vis blob moving left-to-right and growing slightly (approaching).
    progress = (frame_idx % 90) / 90.0
    cx = int(60 + (w - 120) * progress)
    cy = int(h * 0.55)
    blob_h = int(70 + 20 * progress)
    blob_w = int(blob_h * 0.55)
    x1, y1 = cx - blob_w // 2, cy - blob_h // 2
    x2, y2 = cx + blob_w // 2, cy + blob_h // 2
    # Hi-vis yellow-green in BGR. HSV ~ (38, 240, 230).
    vest_color = (60, 240, 220)
    # Torso (full vest).
    import cv2

    cv2.rectangle(img, (x1, y1), (x2, y2), vest_color, -1)
    # Reflective bands (darker stripe across).
    band_y = y1 + blob_h // 2
    cv2.rectangle(img, (x1, band_y - 3), (x2, band_y + 3), (220, 220, 220), -1)
    # Head as a dark circle above the vest.
    cv2.circle(img, (cx, y1 - 12), 10, (40, 40, 40), -1)
    # Add a parked car silhouette for context — not detected, just decoration.
    cv2.rectangle(img, (w - 200, h - 100), (w - 40, h - 30), (70, 70, 80), -1)
    return img


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="PEO MVP demo (hi-vis vest detector)")
    p.add_argument("--source", default=None, help="Video file path, webcam index, RTSP, or HTTP URL")
    p.add_argument("--self-test", action="store_true", help="Run on a synthetic generated stream")
    p.add_argument("--no-audio", action="store_true")
    p.add_argument("--csv", default=None, help="Optional path to log events as CSV")
    p.add_argument("--save", default=None, help="Optional output MP4 path")
    p.add_argument("--save-frame", default=None, help="Save the *last* frame containing a detection as PNG when the run ends")
    p.add_argument("--headless", action="store_true", help="Don't open a window")
    p.add_argument("--max-frames", type=int, default=None, help="Stop after N frames")
    return p.parse_args()


def _open_capture(source: str):
    import cv2

    if source.isdigit():
        return cv2.VideoCapture(int(source))
    return cv2.VideoCapture(source)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    if not args.source and not args.self_test:
        print("ERROR: pass --source PATH or --self-test", file=sys.stderr)
        return 2

    import cv2

    cfg = default_config()
    detector = HiVisDetector(cfg)
    sinks = [CV2WindowSink(cfg)]
    if not args.no_audio:
        sinks.append(AudioAlertSink(cfg))
    if args.csv:
        sinks.append(CSVLogSink(args.csv))
    pipeline = Pipeline(cfg, detector=detector, sinks=sinks)

    cap = None
    if args.source:
        cap = _open_capture(args.source)
        if not cap.isOpened():
            print(f"ERROR: could not open {args.source!r}", file=sys.stderr)
            return 2
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    else:
        fps = 30.0
        w, h = 640, 360

    writer = None
    if args.save:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(args.save, fourcc, fps, (w, h))

    if not args.headless:
        cv2.namedWindow("PEO Demo", cv2.WINDOW_NORMAL)

    last_detection_frame: np.ndarray | None = None
    n_events = 0
    n_frames = 0
    try:
        while True:
            if cap is not None:
                ok, frame = cap.read()
                if not ok:
                    break
            else:
                frame = _synthetic_frame(n_frames, w=w, h=h)
            out, events = pipeline.step(frame, t=n_frames / fps)
            n_events += len(events)
            n_frames += 1
            if writer is not None:
                writer.write(out)
            if args.save_frame and events:
                last_detection_frame = out.copy()
            if not args.headless:
                cv2.imshow("PEO Demo", out)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
            if args.max_frames is not None and n_frames >= args.max_frames:
                break
    finally:
        if args.save_frame and last_detection_frame is not None:
            cv2.imwrite(args.save_frame, last_detection_frame)
            logging.info("Saved annotated frame to %s", args.save_frame)
        if cap is not None:
            cap.release()
        if writer is not None:
            writer.release()
        if not args.headless:
            cv2.destroyAllWindows()
        pipeline.close()
    logging.info("Processed %d frames, %d events", n_frames, n_events)
    return 0 if n_frames > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
