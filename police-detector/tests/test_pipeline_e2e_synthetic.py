"""End-to-end pipeline smoke test using a fake detector that returns scripted
detections. Verifies that bboxes, approach labels, and flash labels all flow
through to rendering + sinks without needing ultralytics installed.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

cv2 = pytest.importorskip("cv2")

from core import (
    CV2WindowSink,
    CSVLogSink,
    Pipeline,
    default_config,
)
from core.types import Detection


class _FakeDetector:
    """Returns a single approaching police-car detection with a flashing red
    light in the top of its bbox. Bbox grows over time."""

    def __init__(self):
        self.frame_idx = 0

    def track(self, frame: np.ndarray):
        self.frame_idx += 1
        # Make the bbox grow by 4% per frame, simulating approach.
        base_w = 60.0 * (1.04 ** self.frame_idx)
        w = min(base_w, frame.shape[1] - 40)
        h = w / 2
        cx, cy = frame.shape[1] / 2, frame.shape[0] / 2
        x1, y1 = cx - w / 2, cy - h / 2
        x2, y2 = cx + w / 2, cy + h / 2
        # Paint a flashing red rectangle in the top of the bbox region.
        top_h = int(h * 0.4)
        if self.frame_idx % 4 < 2:
            color = (20, 20, 220)  # BGR red
        else:
            color = (15, 15, 15)
        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y1) + top_h), color, -1)
        return [
            Detection(
                class_id=0,
                class_name="police_car",
                confidence=0.85,
                x1=x1, y1=y1, x2=x2, y2=y2,
                track_id=7,
            )
        ]


def test_pipeline_e2e_synthetic(tmp_path):
    cfg = default_config()
    csv_path = tmp_path / "events.csv"
    pipeline = Pipeline(
        cfg,
        detector=_FakeDetector(),
        sinks=[CV2WindowSink(cfg), CSVLogSink(str(csv_path))],
    )

    all_events = []
    for i in range(60):
        frame = np.full((360, 640, 3), 80, dtype=np.uint8)
        out, events = pipeline.step(frame, t=i / 30.0)
        all_events.extend(events)
        assert out.shape == frame.shape

    pipeline.close()
    # Should have produced at least a handful of events.
    assert len(all_events) > 5
    # CSV should have content.
    rows = csv_path.read_text().strip().splitlines()
    assert len(rows) >= 2  # header + at least one event row
    # Header should match.
    assert rows[0].split(",")[1] == "kind"
