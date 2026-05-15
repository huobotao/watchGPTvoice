from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.config import default_config
from core.lights import FlashDetector
from core.types import Detection, FlashState, Track

cv2 = pytest.importorskip("cv2")


def _frame_with_color(color_bgr: tuple[int, int, int], shape=(120, 200, 3)) -> np.ndarray:
    img = np.zeros(shape, dtype=np.uint8)
    img[:] = color_bgr
    return img


def _make_track(width: int = 200, height: int = 120) -> Track:
    det = Detection(
        class_id=0,
        class_name="police",
        confidence=0.9,
        x1=0,
        y1=0,
        x2=width,
        y2=height,
        track_id=42,
    )
    return Track(track_id=42, class_name="police", last_detection=det,
                 first_seen_t=0.0, last_seen_t=0.0)


def test_flashing_when_red_blue_alternate():
    cfg = default_config()
    fd = FlashDetector(cfg)
    track = _make_track()
    red = _frame_with_color((20, 20, 220))   # BGR red
    blue = _frame_with_color((220, 30, 20))  # BGR blue
    dark = _frame_with_color((10, 10, 10))
    # Alternate red/dark/blue/dark for ~60 frames; should produce many peaks.
    sequence = [red, dark, blue, dark] * 15
    for f in sequence:
        fd.update(track, f)
    assert track.flash == FlashState.FLASHING


def test_off_when_no_red_or_blue():
    cfg = default_config()
    fd = FlashDetector(cfg)
    track = _make_track()
    plain = _frame_with_color((40, 80, 40))
    for _ in range(60):
        fd.update(track, plain)
    assert track.flash == FlashState.OFF
