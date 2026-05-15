from __future__ import annotations

import csv
import logging
import time
from abc import ABC, abstractmethod
from pathlib import Path
from threading import Lock
from typing import Iterable, Optional

import numpy as np

from .config import Config
from .types import ApproachState, Event, EventKind, FlashState, Track

log = logging.getLogger(__name__)


class AlertSink(ABC):
    @abstractmethod
    def emit(self, event: Event) -> None: ...

    def render(self, frame: np.ndarray, tracks: Iterable[Track]) -> np.ndarray:
        """Optional: overlay something on the frame. Default is a passthrough."""
        return frame

    def close(self) -> None:
        pass


class AudioAlertSink(AlertSink):
    """Plays a beep on alert. Debounces per (kind) so we don't spam audio."""

    def __init__(self, config: Config):
        self.config = config
        self._last_played: dict[EventKind, float] = {}
        self._lock = Lock()

    def emit(self, event: Event) -> None:
        with self._lock:
            now = event.t
            last = self._last_played.get(event.kind, 0.0)
            if now - last < self.config.alert_cooldown_seconds:
                return
            self._last_played[event.kind] = now
        high = event.kind in (
            EventKind.POLICE_APPROACHING,
            EventKind.POLICE_FLASHING,
            EventKind.POLICE_APPROACHING_FLASHING,
        )
        path = self.config.alert_audio_high_path if high else self.config.alert_audio_path
        self._play(self.config.resolve(path))

    def _play(self, wav_path: str) -> None:
        if not Path(wav_path).exists():
            log.info("Alert (no wav at %s): kind played silently", wav_path)
            return
        try:
            import simpleaudio
        except ImportError:
            log.info("simpleaudio not installed; printing alert instead.")
            print(f"\a[ALERT] {wav_path}")
            return
        try:
            wave_obj = simpleaudio.WaveObject.from_wave_file(wav_path)
            wave_obj.play()  # non-blocking; don't wait_done()
        except Exception as e:
            log.warning("Failed to play alert wav %s: %s", wav_path, e)


class CV2WindowSink(AlertSink):
    """Renders bounding boxes, labels, and a banner alert on the frame.

    This sink doesn't open its own window — it just paints on the frame; the
    caller does cv2.imshow. That keeps headless tests easy.
    """

    BANNER_HEIGHT = 56

    def __init__(self, config: Config):
        self.config = config
        self._active_banner: Optional[tuple[float, str]] = None  # (expire_t, text)

    def emit(self, event: Event) -> None:
        expire = event.t + max(2.0, self.config.alert_cooldown_seconds / 2)
        self._active_banner = (expire, event.message or event.kind.value)

    def render(self, frame: np.ndarray, tracks: Iterable[Track]) -> np.ndarray:
        import cv2

        for tr in tracks:
            d = tr.last_detection
            color = self._color_for(tr)
            cv2.rectangle(frame, (int(d.x1), int(d.y1)), (int(d.x2), int(d.y2)), color, 2)
            label_parts = [tr.class_name, f"id={tr.track_id}"]
            if tr.approach != ApproachState.UNKNOWN:
                label_parts.append(tr.approach.value)
            if tr.flash == FlashState.FLASHING:
                label_parts.append("FLASHING")
            label = " ".join(label_parts)
            cv2.putText(
                frame,
                label,
                (int(d.x1), max(int(d.y1) - 6, 14)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
                cv2.LINE_AA,
            )
            # Arrow showing approach direction.
            if tr.approach == ApproachState.APPROACHING:
                cv2.arrowedLine(
                    frame,
                    (int(d.cx), int(d.y1) - 30),
                    (int(d.cx), int(d.y1) - 5),
                    (0, 0, 255),
                    3,
                    tipLength=0.4,
                )
        # Banner.
        if self._active_banner is not None:
            expire, text = self._active_banner
            now = time.time()
            if now < expire:
                self._draw_banner(frame, text)
            else:
                self._active_banner = None
        return frame

    def _color_for(self, track: Track) -> tuple[int, int, int]:
        if track.flash == FlashState.FLASHING:
            return (0, 0, 255)  # bright red
        if track.approach == ApproachState.APPROACHING:
            return (0, 128, 255)  # orange
        return (0, 200, 0)  # green

    def _draw_banner(self, frame: np.ndarray, text: str) -> None:
        import cv2

        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, self.BANNER_HEIGHT), (0, 0, 220), -1)
        cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)
        cv2.putText(
            frame,
            text,
            (16, 38),
            cv2.FONT_HERSHEY_DUPLEX,
            1.0,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )


class CSVLogSink(AlertSink):
    """Append events to a CSV file. Useful for TeslaCam batch mode."""

    FIELDS = [
        "t",
        "kind",
        "track_id",
        "class_name",
        "approach",
        "flash",
        "x1",
        "y1",
        "x2",
        "y2",
        "confidence",
        "message",
    ]

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        is_new = not self.path.exists()
        self._fh = open(self.path, "a", newline="")
        self._writer = csv.DictWriter(self._fh, fieldnames=self.FIELDS)
        if is_new:
            self._writer.writeheader()
            self._fh.flush()

    def emit(self, event: Event) -> None:
        d = event.track.last_detection
        self._writer.writerow({
            "t": f"{event.t:.3f}",
            "kind": event.kind.value,
            "track_id": event.track.track_id,
            "class_name": event.track.class_name,
            "approach": event.track.approach.value,
            "flash": event.track.flash.value,
            "x1": f"{d.x1:.1f}",
            "y1": f"{d.y1:.1f}",
            "x2": f"{d.x2:.1f}",
            "y2": f"{d.y2:.1f}",
            "confidence": f"{d.confidence:.3f}",
            "message": event.message,
        })
        self._fh.flush()

    def close(self) -> None:
        try:
            self._fh.close()
        except Exception:
            pass
