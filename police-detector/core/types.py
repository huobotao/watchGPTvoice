from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ApproachState(str, Enum):
    UNKNOWN = "unknown"
    APPROACHING = "approaching"
    RECEDING = "receding"
    STATIONARY = "stationary"


class FlashState(str, Enum):
    UNKNOWN = "unknown"
    FLASHING = "flashing"
    OFF = "off"


class EventKind(str, Enum):
    POLICE_SEEN = "police_seen"
    POLICE_APPROACHING = "police_approaching"
    POLICE_FLASHING = "police_flashing"
    POLICE_APPROACHING_FLASHING = "police_approaching_flashing"
    PEO_SEEN = "peo_seen"


@dataclass
class Detection:
    """One raw detection in a single frame."""
    class_id: int
    class_name: str
    confidence: float
    # xyxy in pixel coordinates
    x1: float
    y1: float
    x2: float
    y2: float
    track_id: Optional[int] = None

    @property
    def width(self) -> float:
        return self.x2 - self.x1

    @property
    def height(self) -> float:
        return self.y2 - self.y1

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def cx(self) -> float:
        return (self.x1 + self.x2) / 2.0

    @property
    def cy(self) -> float:
        return (self.y1 + self.y2) / 2.0


@dataclass
class Track:
    """A persistent multi-frame object identity with derived state."""
    track_id: int
    class_name: str
    last_detection: Detection
    first_seen_t: float
    last_seen_t: float
    approach: ApproachState = ApproachState.UNKNOWN
    flash: FlashState = FlashState.UNKNOWN
    # Rolling state populated by ApproachEstimator / FlashDetector.
    approach_score: float = 0.0  # normalized dw/dt
    flash_score: float = 0.0     # peak count in window


@dataclass
class Event:
    """A higher-level alert event emitted by the pipeline."""
    kind: EventKind
    t: float
    track: Track
    message: str = ""
    extra: dict = field(default_factory=dict)
