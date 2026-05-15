"""Export the police-car YOLO model to NCNN format for Raspberry Pi.

Produces a folder `models/police_yolov11n_ncnn_model/` containing the .param +
.bin files. Ultralytics handles the conversion in one call.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default=str(ROOT / "models" / "police_yolov11n.pt"))
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
    out = model.export(format="ncnn")
    print(f"NCNN export: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
