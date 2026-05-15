from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque

from .config import Config
from .types import ApproachState, Track


@dataclass
class _TrackHistory:
    samples: Deque[tuple[float, float]] = field(default_factory=lambda: deque(maxlen=15))


class ApproachEstimator:
    """Estimates whether a tracked object is approaching, receding, or stationary
    based on the growth rate of its bounding-box width over a short window.

    The math is intentionally simple: we fit a line to (t, log(width)) over the
    last N samples. The slope is roughly the fractional growth rate per second,
    which is monotonically related to time-to-collision for a forward-facing
    camera and a known object size. The exact value isn't important — only its
    sign + magnitude relative to a threshold.
    """

    def __init__(self, config: Config):
        self.config = config
        self._hist: dict[int, _TrackHistory] = {}
        # Hysteresis: remember last label so we only flip on a clear margin.
        self._last_label: dict[int, ApproachState] = {}

    def update(self, track: Track, t: float) -> ApproachState:
        cfg = self.config
        h = self._hist.setdefault(track.track_id, _TrackHistory(
            samples=deque(maxlen=cfg.approach_window_frames)
        ))
        w = max(track.last_detection.width, 1.0)
        h.samples.append((t, w))
        if len(h.samples) < cfg.approach_min_samples:
            track.approach = ApproachState.UNKNOWN
            return track.approach

        # Linear regression of log(width) vs t.
        import math
        ts = [s[0] for s in h.samples]
        ys = [math.log(s[1]) for s in h.samples]
        n = len(ts)
        mean_t = sum(ts) / n
        mean_y = sum(ys) / n
        num = sum((ts[i] - mean_t) * (ys[i] - mean_y) for i in range(n))
        den = sum((ts[i] - mean_t) ** 2 for i in range(n))
        slope = (num / den) if den > 1e-9 else 0.0  # ~ fractional growth per second

        track.approach_score = slope

        last = self._last_label.get(track.track_id, ApproachState.UNKNOWN)
        thr = cfg.approach_growth_threshold
        hys = cfg.approach_hysteresis
        # Apply hysteresis: need to exceed (thr + hys) to enter APPROACHING/RECEDING,
        # but only (thr - hys) to stay there.
        def _classify() -> ApproachState:
            if last == ApproachState.APPROACHING:
                if slope > thr - hys:
                    return ApproachState.APPROACHING
            if last == ApproachState.RECEDING:
                if slope < -(thr - hys):
                    return ApproachState.RECEDING
            if slope > thr + hys:
                return ApproachState.APPROACHING
            if slope < -(thr + hys):
                return ApproachState.RECEDING
            return ApproachState.STATIONARY

        label = _classify()
        self._last_label[track.track_id] = label
        track.approach = label
        return label

    def forget(self, track_id: int) -> None:
        self._hist.pop(track_id, None)
        self._last_label.pop(track_id, None)
