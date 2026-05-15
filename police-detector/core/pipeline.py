from __future__ import annotations

import logging
import time
from typing import Iterable

import numpy as np

from .approach import ApproachEstimator
from .alerter import AlertSink
from .config import Config
from .detector import PoliceDetector
from .lights import FlashDetector
from .tracker import Tracker
from .types import ApproachState, Event, EventKind, FlashState, Track

log = logging.getLogger(__name__)


def _is_peo(track: Track) -> bool:
    name = track.class_name.lower()
    return "peo" in name or "parking" in name or "meter" in name or "go-4" in name or "cushman" in name


def _is_police(track: Track) -> bool:
    name = track.class_name.lower()
    return "police" in name or "patrol" in name or "cruiser" in name


def _event_for(track: Track, t: float) -> Event | None:
    if _is_peo(track):
        return Event(
            kind=EventKind.PEO_SEEN,
            t=t,
            track=track,
            message="Parking enforcement nearby",
        )
    if not _is_police(track):
        # On the COCO fallback we may have generic vehicles; surface them as
        # informational POLICE_SEEN with low priority so the UI shows something
        # without spamming high-pri audio.
        if track.last_detection.confidence < 0.6:
            return None
        return Event(
            kind=EventKind.POLICE_SEEN,
            t=t,
            track=track,
            message=f"{track.class_name}",
        )
    if track.approach == ApproachState.APPROACHING and track.flash == FlashState.FLASHING:
        return Event(
            kind=EventKind.POLICE_APPROACHING_FLASHING,
            t=t,
            track=track,
            message="Police approaching with lights on!",
        )
    if track.flash == FlashState.FLASHING:
        return Event(
            kind=EventKind.POLICE_FLASHING,
            t=t,
            track=track,
            message="Police with lights on",
        )
    if track.approach == ApproachState.APPROACHING:
        return Event(
            kind=EventKind.POLICE_APPROACHING,
            t=t,
            track=track,
            message="Police approaching",
        )
    return Event(kind=EventKind.POLICE_SEEN, t=t, track=track, message="Police nearby")


class Pipeline:
    """Frame-by-frame orchestrator: detect → track → classify → emit events → render."""

    def __init__(
        self,
        config: Config,
        detector: PoliceDetector | None = None,
        sinks: Iterable[AlertSink] | None = None,
    ):
        self.config = config
        self.detector = detector or PoliceDetector(config)
        self.tracker = Tracker()
        self.approach = ApproachEstimator(config)
        self.flash = FlashDetector(config)
        self.sinks: list[AlertSink] = list(sinks) if sinks else []
        self._frame_idx = 0
        self._t0: float | None = None

    def add_sink(self, sink: AlertSink) -> None:
        self.sinks.append(sink)

    def step(self, frame: np.ndarray, t: float | None = None) -> tuple[np.ndarray, list[Event]]:
        if t is None:
            if self._t0 is None:
                self._t0 = time.time()
            t = time.time() - self._t0
        self._frame_idx += 1

        detections = self.detector.track(frame)
        tracks = self.tracker.update(detections, t)
        events: list[Event] = []
        for tr in tracks:
            self.approach.update(tr, t)
            self.flash.update(tr, frame)
            ev = _event_for(tr, t)
            if ev is None:
                continue
            events.append(ev)
            for sink in self.sinks:
                sink.emit(ev)

        out = frame
        for sink in self.sinks:
            out = sink.render(out, tracks)
        return out, events

    def close(self) -> None:
        for sink in self.sinks:
            sink.close()
