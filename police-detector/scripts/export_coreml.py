"""Export the police-car YOLO model to CoreML for the iOS app.

Produces a `.mlpackage` next to the source weights. Drag it into the Xcode
project under apps/ios/ to use it via Vision/VNCoreMLRequest.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default=str(ROOT / "models" / "police_yolov11n.pt"))
    parser.add_argument("--nms", action="store_true", default=True, help="Bake NMS into the export")
    args = parser.parse_args()

    if not Path(args.weights).exists():
        print(f"ERROR: weights not found: {args.weights}", file=sys.stderr)
        return 1
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: install ultralytics first (`pip install -r requirements.txt`)", file=sys.stderr)
        return 1

    model = YOLO(args.weights)
    out = model.export(format="coreml", nms=args.nms)
    print(f"CoreML export: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
