from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

cv2 = pytest.importorskip("cv2")

from core.peo_vest import HiVisDetector


def _frame_with_vest(color_bgr=(60, 240, 220), size=(360, 640), vest_box=(280, 150, 360, 260)):
    h, w = size
    img = np.full((h, w, 3), 95, dtype=np.uint8)
    x1, y1, x2, y2 = vest_box
    cv2.rectangle(img, (x1, y1), (x2, y2), color_bgr, -1)
    return img


def test_detects_hi_vis_yellow_vest():
    det = HiVisDetector()
    frame = _frame_with_vest()
    out = det.infer(frame)
    assert len(out) == 1, f"expected 1 detection, got {len(out)}"
    d = out[0]
    assert d.class_name == "peo_suspect"
    assert d.confidence >= 0.5
    # Bbox should overlap the painted region.
    assert 270 <= d.x1 <= 290
    assert 350 <= d.x2 <= 370


def test_detects_hi_vis_orange_vest():
    det = HiVisDetector()
    # HSV ~ (10, 220, 230) → BGR roughly (50, 130, 230)
    frame = _frame_with_vest(color_bgr=(50, 130, 230))
    out = det.infer(frame)
    assert len(out) == 1, f"expected 1 detection, got {len(out)}"


def test_ignores_non_hi_vis():
    det = HiVisDetector()
    # Generic gray scene with a navy-blue rectangle (not hi-vis).
    frame = _frame_with_vest(color_bgr=(80, 30, 30))
    out = det.infer(frame)
    assert out == [], f"expected no detections, got {out}"


def test_ignores_tiny_blobs():
    det = HiVisDetector()
    h, w = 360, 640
    img = np.full((h, w, 3), 95, dtype=np.uint8)
    # 5x5 hi-vis dot is far too small to be a vest.
    cv2.rectangle(img, (300, 200), (305, 205), (60, 240, 220), -1)
    out = det.infer(img)
    assert out == [], "tiny hi-vis dot should be filtered by min_area_frac"


def test_stable_track_ids_across_frames():
    det = HiVisDetector()
    box = (280, 150, 360, 260)
    out1 = det.infer(_frame_with_vest(vest_box=box))
    # Shift the box by 5px — should still be the same track via IOU.
    box2 = (285, 152, 365, 262)
    out2 = det.infer(_frame_with_vest(vest_box=box2))
    assert out1 and out2
    assert out1[0].track_id == out2[0].track_id


def test_aspect_ratio_filter_kills_horizontal_band():
    det = HiVisDetector()
    h, w = 360, 640
    img = np.full((h, w, 3), 95, dtype=np.uint8)
    # A wide, thin yellow band — looks like a road marking, not a vest.
    cv2.rectangle(img, (50, 200), (590, 215), (60, 240, 220), -1)
    out = det.infer(img)
    assert out == [], "wide horizontal yellow band should fail the aspect filter"
