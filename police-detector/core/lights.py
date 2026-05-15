from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque

import numpy as np

from .config import Config
from .types import FlashState, Track


# HSV ranges. OpenCV hue is 0-179.
RED_LOW_1 = np.array([0, 110, 110])
RED_HIGH_1 = np.array([10, 255, 255])
RED_LOW_2 = np.array([170, 110, 110])
RED_HIGH_2 = np.array([179, 255, 255])
BLUE_LOW = np.array([100, 110, 110])
BLUE_HIGH = np.array([130, 255, 255])


@dataclass
class _Series:
    red: Deque[float] = field(default_factory=lambda: deque(maxlen=45))
    blue: Deque[float] = field(default_factory=lambda: deque(maxlen=45))


class FlashDetector:
    """Detects whether a tracked vehicle has a flashing red/blue lightbar.

    For each frame we crop the top fraction of the detection bbox (where a
    lightbar would be), threshold red and blue in HSV, and track the area of
    each mask over a short rolling window. If either channel shows several
    peaks in the window (i.e. the area is oscillating), we call it FLASHING.
    """

    def __init__(self, config: Config):
        self.config = config
        self._series: dict[int, _Series] = {}

    def _ensure(self, track_id: int) -> _Series:
        s = self._series.get(track_id)
        if s is None:
            wl = self.config.flash_window_frames
            s = _Series(red=deque(maxlen=wl), blue=deque(maxlen=wl))
            self._series[track_id] = s
        return s

    def update(self, track: Track, frame: np.ndarray) -> FlashState:
        import cv2  # lazy: keeps module importable for unit tests

        cfg = self.config
        det = track.last_detection
        h_img, w_img = frame.shape[:2]
        x1 = max(0, int(det.x1))
        y1 = max(0, int(det.y1))
        x2 = min(w_img, int(det.x2))
        y2 = min(h_img, int(det.y2))
        if x2 <= x1 + 2 or y2 <= y1 + 2:
            track.flash = FlashState.UNKNOWN
            return track.flash
        roi_y2 = y1 + max(2, int((y2 - y1) * cfg.flash_roi_top_fraction))
        roi = frame[y1:roi_y2, x1:x2]
        if roi.size == 0:
            track.flash = FlashState.UNKNOWN
            return track.flash

        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        red_mask = cv2.inRange(hsv, RED_LOW_1, RED_HIGH_1) | cv2.inRange(hsv, RED_LOW_2, RED_HIGH_2)
        blue_mask = cv2.inRange(hsv, BLUE_LOW, BLUE_HIGH)

        roi_area = max(roi.shape[0] * roi.shape[1], 1)
        red_frac = float(red_mask.sum()) / 255.0 / roi_area
        blue_frac = float(blue_mask.sum()) / 255.0 / roi_area

        s = self._ensure(track.track_id)
        s.red.append(red_frac)
        s.blue.append(blue_frac)

        if len(s.red) < cfg.flash_window_frames // 2:
            track.flash = FlashState.UNKNOWN
            return track.flash

        peaks = self._count_peaks(list(s.red)) + self._count_peaks(list(s.blue))
        track.flash_score = float(peaks)
        track.flash = FlashState.FLASHING if peaks >= cfg.flash_min_peaks else FlashState.OFF
        return track.flash

    def _count_peaks(self, series: list[float]) -> int:
        if len(series) < 5:
            return 0
        try:
            from scipy.signal import find_peaks
        except ImportError:
            return self._count_peaks_naive(series)
        arr = np.array(series, dtype=float)
        baseline = float(arr.std()) or 1e-6
        peaks, _ = find_peaks(
            arr,
            distance=self.config.flash_peak_distance_frames,
            prominence=self.config.flash_peak_prominence_ratio * baseline,
        )
        return int(len(peaks))

    def _count_peaks_naive(self, series: list[float]) -> int:
        # Local-maximum count with a small neighborhood; for environments
        # without scipy (rare — listed in requirements but kept robust).
        n = len(series)
        d = self.config.flash_peak_distance_frames
        peaks = 0
        for i in range(1, n - 1):
            lo = max(0, i - d)
            hi = min(n, i + d + 1)
            if series[i] == max(series[lo:hi]) and series[i] > 0:
                peaks += 1
        return peaks

    def forget(self, track_id: int) -> None:
        self._series.pop(track_id, None)
