from __future__ import annotations

from typing import Iterable

from .types import Detection, Track


class Tracker:
    """Maintains a Track per track_id seen across frames.

    Ultralytics' built-in ByteTrack already assigns stable ids; this class just
    keeps the latest Detection per id, plus first/last seen timestamps, and
    evicts stale tracks. Approach and flash state are owned by ApproachEstimator
    and FlashDetector; we just hold the resulting labels.
    """

    def __init__(self, eviction_grace_seconds: float = 1.5):
        self.tracks: dict[int, Track] = {}
        self.eviction_grace = eviction_grace_seconds

    def update(self, detections: Iterable[Detection], t: float) -> list[Track]:
        active: list[Track] = []
        for det in detections:
            if det.track_id is None:
                continue
            tid = det.track_id
            tr = self.tracks.get(tid)
            if tr is None:
                tr = Track(
                    track_id=tid,
                    class_name=det.class_name,
                    last_detection=det,
                    first_seen_t=t,
                    last_seen_t=t,
                )
                self.tracks[tid] = tr
            else:
                tr.last_detection = det
                tr.last_seen_t = t
                tr.class_name = det.class_name
            active.append(tr)
        # Evict tracks not seen recently.
        stale = [tid for tid, tr in self.tracks.items() if t - tr.last_seen_t > self.eviction_grace]
        for tid in stale:
            self.tracks.pop(tid, None)
        return active
