"""Fetch a pretrained YOLO model for police-car detection.

We try a few sources in order of preference. If all of them fail, we leave the
file absent and the detector will fall back to a generic COCO YOLO model. Run
this once before the desktop demo:

    python scripts/download_weights.py
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

log = logging.getLogger("download_weights")

# Each entry: (url, optional sha256). The first successful download wins.
# These point at GitHub Releases artifacts on community police-vehicle YOLO
# repos. If/when upstream URLs rot, drop in a replacement here.
WEIGHT_SOURCES: list[tuple[str, str | None]] = [
    # dynle/japanese-emergency-vehicles-detection v1 release asset
    ("https://github.com/dynle/japanese-emergency-vehicles-detection/releases/download/v1.0/best.pt", None),
    # atcode11/Real-Time-Detection-of-Vehicle-Types-using-Yolo
    ("https://github.com/atcode11/Real-Time-Detection-of-Vehicle-Types-using-Yolo/releases/download/v1.0/best.pt", None),
]

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "models" / "police_yolov11n.pt"


def _download(url: str, dest: Path, expected_sha256: str | None) -> bool:
    try:
        import requests
    except ImportError:
        log.error("requests not installed; run `pip install -r requirements.txt`")
        return False
    log.info("Trying %s", url)
    try:
        with requests.get(url, stream=True, timeout=30) as resp:
            if resp.status_code != 200:
                log.warning("  HTTP %s", resp.status_code)
                return False
            tmp = dest.with_suffix(dest.suffix + ".part")
            sha = hashlib.sha256()
            with open(tmp, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    if not chunk:
                        continue
                    fh.write(chunk)
                    sha.update(chunk)
            digest = sha.hexdigest()
            if expected_sha256 and digest != expected_sha256:
                log.warning("  sha256 mismatch: got %s, want %s", digest, expected_sha256)
                tmp.unlink(missing_ok=True)
                return False
            shutil.move(tmp, dest)
            log.info("  saved %s (sha256=%s)", dest, digest)
            return True
    except Exception as e:
        log.warning("  download failed: %s", e)
        return False


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--url", default=None, help="Override: a single URL to fetch")
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)

    sources = [(args.url, None)] if args.url else WEIGHT_SOURCES
    for url, sha in sources:
        if _download(url, args.out, sha):
            print(f"OK: {args.out}")
            return 0

    print(
        "WARNING: no upstream weights downloadable. The detector will fall back\n"
        "to a generic COCO YOLO ('yolov8n.pt'), which Ultralytics will auto-fetch\n"
        "on first use. You'll see generic 'car' boxes instead of 'police' boxes.\n"
        "Drop your own .pt at: " + str(args.out),
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
