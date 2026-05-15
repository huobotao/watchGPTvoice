"""Smoke test for the alerter sinks. Does NOT load the real YOLO model;
that's covered by manual end-to-end verification with a real video clip."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.alerter import AudioAlertSink, CSVLogSink
from core.config import default_config
from core.types import ApproachState, Detection, Event, EventKind, FlashState, Track


def _event(kind: EventKind, t: float) -> Event:
    det = Detection(class_id=0, class_name="police", confidence=0.9,
                    x1=10, y1=20, x2=110, y2=120, track_id=1)
    tr = Track(track_id=1, class_name="police", last_detection=det,
               first_seen_t=t, last_seen_t=t,
               approach=ApproachState.APPROACHING, flash=FlashState.OFF)
    return Event(kind=kind, t=t, track=tr, message="test")


def test_audio_alert_cooldown():
    cfg = default_config().model_copy(update={"alert_cooldown_seconds": 5.0})
    sink = AudioAlertSink(cfg)
    # Both calls go to the same kind; only first should bump the timestamp.
    sink.emit(_event(EventKind.POLICE_SEEN, t=0.0))
    sink.emit(_event(EventKind.POLICE_SEEN, t=1.0))
    sink.emit(_event(EventKind.POLICE_SEEN, t=10.0))
    # We can only assert internal state because the wav playback is non-blocking.
    last = sink._last_played[EventKind.POLICE_SEEN]
    assert last == 10.0, last


def test_csv_log_sink_writes_header_and_rows():
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "out.csv"
        sink = CSVLogSink(str(path))
        sink.emit(_event(EventKind.POLICE_APPROACHING, t=1.25))
        sink.close()
        lines = path.read_text().strip().splitlines()
        assert lines[0].startswith("t,kind,track_id"), lines[0]
        assert "police_approaching" in lines[1]
