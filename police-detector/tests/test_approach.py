from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.approach import ApproachEstimator
from core.config import default_config
from core.types import ApproachState, Detection, Track


def _make_track(track_id: int, width: float) -> Track:
    det = Detection(
        class_id=0,
        class_name="police",
        confidence=0.9,
        x1=100.0,
        y1=100.0,
        x2=100.0 + width,
        y2=100.0 + width / 2,
        track_id=track_id,
    )
    return Track(track_id=track_id, class_name="police", last_detection=det,
                 first_seen_t=0.0, last_seen_t=0.0)


def test_approaching_when_bbox_grows():
    cfg = default_config()
    est = ApproachEstimator(cfg)
    track = _make_track(1, 50.0)
    for i in range(20):
        # 6% per second growth — well above the default threshold.
        width = 50.0 * (1.06 ** (i / 30.0))
        track.last_detection.x2 = track.last_detection.x1 + width
        est.update(track, t=i / 30.0)
    assert track.approach == ApproachState.APPROACHING, track.approach


def test_receding_when_bbox_shrinks():
    cfg = default_config()
    est = ApproachEstimator(cfg)
    track = _make_track(2, 150.0)
    for i in range(20):
        width = 150.0 * (0.94 ** (i / 30.0))
        track.last_detection.x2 = track.last_detection.x1 + width
        est.update(track, t=i / 30.0)
    assert track.approach == ApproachState.RECEDING, track.approach


def test_stationary_when_bbox_stable():
    cfg = default_config()
    est = ApproachEstimator(cfg)
    track = _make_track(3, 80.0)
    for i in range(20):
        # tiny jitter; ~no net growth
        width = 80.0 + ((-1) ** i) * 0.2
        track.last_detection.x2 = track.last_detection.x1 + width
        est.update(track, t=i / 30.0)
    assert track.approach == ApproachState.STATIONARY, track.approach
