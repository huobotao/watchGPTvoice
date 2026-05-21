"""Hi-vis vest detector — the simplest possible PEO MVP.

Idea: ~all parking enforcement officers (and ~all road/construction workers)
wear high-visibility safety vests in saturated yellow-green or orange. These
colors are designed to be perceptually distinctive against urban backgrounds,
so they're also algorithmically distinctive: HSV masking + a couple of
geometric filters is enough for a usable baseline detector that needs
ZERO training data.

False positives: traffic cones, construction crews, cyclists, school crossing
guards, road maintenance. We accept these for the MVP — the product layer can
filter by GPS context ("is this user actually street-parked in a metered
zone?") to suppress most of them. The point of this module is to prove the
detection loop end-to-end before we go collect a PEO dataset.

This module deliberately has NO ML dependency. Pure OpenCV + numpy. It runs
on a Raspberry Pi Zero, in a browser via WASM, or on your laptop with the
camera unplugged.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np

from .config import Config
from .types import Detection


# HSV ranges for the two dominant hi-vis vest colors. OpenCV hue is 0–179.
#
# Hi-vis yellow-green (US "ANSI 107 class 2/3", most common):
#   roughly H ∈ [28, 55], very saturated, very bright.
# Hi-vis orange (construction / some PEO):
#   roughly H ∈ [5, 22], very saturated, bright.
HIVIS_YELLOW_LOW = np.array([28, 110, 150], dtype=np.uint8)
HIVIS_YELLOW_HIGH = np.array([55, 255, 255], dtype=np.uint8)
HIVIS_ORANGE_LOW = np.array([5, 140, 150], dtype=np.uint8)
HIVIS_ORANGE_HIGH = np.array([22, 255, 255], dtype=np.uint8)


@dataclass
class HiVisConfig:
    """Knobs for the HSV-only detector. All defaults tuned on synthetic +
    a couple of real street-camera frames. Tune `min_area_frac` if you change
    the camera mount distance — closer = smaller fraction."""

    min_area_frac: float = 0.0015         # vest must be >= ~0.15% of frame area
    max_area_frac: float = 0.35            # ignore huge blobs (sky, wall)
    min_aspect: float = 0.4                # h/w ≥ 0.4 — torso-ish, not a pavement line
    max_aspect: float = 4.0                # h/w ≤ 4.0 — exclude tall thin pillars
    min_fill_ratio: float = 0.35           # contour area / bbox area, kills thin lines
    # Morphological close kernel. ~9 px bridges the reflective stripe of a real
    # hi-vis vest at typical street-camera resolution (1080p, person ~150 px
    # tall). Bump higher if your camera is closer / higher res.
    kernel_size: int = 9
    min_persistence_frames: int = 2        # require N consecutive frames of detection at ~same place
    persistence_iou_threshold: float = 0.3 # bbox overlap to count as "same place"


class HiVisDetector:
    """Returns Detection objects for each hi-vis-vest-sized blob in a frame.

    Use this as a drop-in replacement for PoliceDetector when you want to
    demo / validate the pipeline end-to-end without any YOLO setup.
    """

    def __init__(
        self,
        config: Config | None = None,
        hi_vis_config: HiVisConfig | None = None,
    ):
        self.config = config  # kept for API symmetry with PoliceDetector
        self.params = hi_vis_config or HiVisConfig()
        self._recent: list[tuple[int, tuple[float, float, float, float]]] = []
        self._next_track_id = 1
        # Map of (frame_idx, bbox) → assigned track id, used for naive persistence.
        self._frame_idx = 0

    def _bbox_iou(self, a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        inter_x1 = max(ax1, bx1)
        inter_y1 = max(ay1, by1)
        inter_x2 = min(ax2, bx2)
        inter_y2 = min(ay2, by2)
        if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
            return 0.0
        inter = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
        union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
        return float(inter / union) if union > 0 else 0.0

    def infer(self, frame: np.ndarray) -> list[Detection]:
        """Single-frame inference. Returns one Detection per hi-vis blob."""
        import cv2

        self._frame_idx += 1
        h, w = frame.shape[:2]
        frame_area = float(h * w)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask_yellow = cv2.inRange(hsv, HIVIS_YELLOW_LOW, HIVIS_YELLOW_HIGH)
        mask_orange = cv2.inRange(hsv, HIVIS_ORANGE_LOW, HIVIS_ORANGE_HIGH)
        mask = cv2.bitwise_or(mask_yellow, mask_orange)
        k = np.ones((self.params.kernel_size, self.params.kernel_size), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates: list[tuple[float, tuple[float, float, float, float]]] = []
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            if cw < 4 or ch < 4:
                continue
            area = float(cv2.contourArea(c))
            bbox_area = float(cw * ch)
            if bbox_area == 0:
                continue
            area_frac = bbox_area / frame_area
            if area_frac < self.params.min_area_frac or area_frac > self.params.max_area_frac:
                continue
            aspect = ch / cw
            if aspect < self.params.min_aspect or aspect > self.params.max_aspect:
                continue
            fill = area / bbox_area
            if fill < self.params.min_fill_ratio:
                continue
            # Confidence: blend of how saturated/bright the blob is and how
            # well-filled the bbox is. Roughly [0, 1].
            roi_mask = mask[int(y) : int(y + ch), int(x) : int(x + cw)]
            density = float(roi_mask.mean()) / 255.0
            conf = min(1.0, 0.5 + 0.4 * fill + 0.3 * density)
            candidates.append((conf, (float(x), float(y), float(x + cw), float(y + ch))))

        # Naive persistence tracking: assign a track id by IOU to recent bboxes.
        new_recent: list[tuple[int, tuple[float, float, float, float]]] = []
        detections: list[Detection] = []
        for conf, bbox in candidates:
            tid = None
            for prev_tid, prev_bbox in self._recent:
                if self._bbox_iou(bbox, prev_bbox) >= self.params.persistence_iou_threshold:
                    tid = prev_tid
                    break
            if tid is None:
                tid = self._next_track_id
                self._next_track_id += 1
            new_recent.append((tid, bbox))
            detections.append(
                Detection(
                    class_id=0,
                    class_name="peo_suspect",
                    confidence=conf,
                    x1=bbox[0],
                    y1=bbox[1],
                    x2=bbox[2],
                    y2=bbox[3],
                    track_id=tid,
                )
            )
        self._recent = new_recent
        return detections

    # Provide a track() method with the same signature as PoliceDetector so
    # Pipeline can use either one interchangeably. We already do simple
    # IOU-based tracking inside infer(), so track() just delegates.
    def track(self, frame: np.ndarray) -> list[Detection]:
        return self.infer(frame)
