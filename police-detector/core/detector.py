from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import numpy as np

from .config import Config
from .types import Detection

log = logging.getLogger(__name__)


def _name_matches(name: str, keywords: Iterable[str]) -> bool:
    n = name.lower().replace(" ", "_")
    return any(kw.lower().replace(" ", "_") in n for kw in keywords)


class PoliceDetector:
    """Thin wrapper around an Ultralytics YOLO model that filters to police-relevant
    classes and returns a list of Detection objects.

    Lazy-imports `ultralytics` so the module is import-safe in environments where
    the package isn't installed (tests, CI). The actual inference call requires it.
    """

    def __init__(self, config: Config, weights_path: str | None = None):
        self.config = config
        weights = weights_path or config.model_path
        weights_abs = config.resolve(weights)
        if not Path(weights_abs).exists():
            log.warning(
                "Primary weights %s not found; falling back to %s",
                weights_abs,
                config.fallback_model,
            )
            weights_abs = config.fallback_model
        self._weights_path = weights_abs
        self._model = None  # lazy

    def _ensure_model(self):
        if self._model is None:
            try:
                from ultralytics import YOLO
            except ImportError as e:
                raise RuntimeError(
                    "ultralytics is required to run inference; "
                    "install via `pip install -r requirements.txt`"
                ) from e
            log.info("Loading YOLO weights from %s", self._weights_path)
            self._model = YOLO(self._weights_path)
        return self._model

    def class_names(self) -> dict[int, str]:
        model = self._ensure_model()
        names = getattr(model, "names", {})
        if isinstance(names, dict):
            return {int(k): str(v) for k, v in names.items()}
        return {i: str(v) for i, v in enumerate(names)}

    def _keep_class(self, name: str) -> bool:
        cfg = self.config
        if _name_matches(name, cfg.police_class_keywords):
            return True
        if _name_matches(name, cfg.peo_class_keywords):
            return True
        # If we're on the fallback COCO model, allow generic vehicles through so
        # the demo at least draws something. The pipeline will tag confidence.
        if Path(self._weights_path).name == cfg.fallback_model:
            if _name_matches(name, cfg.coco_fallback_class_keywords):
                return True
        return False

    def infer(self, frame: np.ndarray) -> list[Detection]:
        """Single-frame inference. No tracking."""
        model = self._ensure_model()
        cfg = self.config
        results = model.predict(
            frame,
            conf=cfg.confidence_threshold,
            iou=cfg.iou_threshold,
            imgsz=cfg.imgsz,
            verbose=False,
        )
        return self._parse(results, with_tracks=False)

    def track(self, frame: np.ndarray) -> list[Detection]:
        """Single-frame inference + tracker, returning detections with track_id."""
        model = self._ensure_model()
        cfg = self.config
        results = model.track(
            frame,
            conf=cfg.confidence_threshold,
            iou=cfg.iou_threshold,
            imgsz=cfg.imgsz,
            tracker=cfg.tracker_yaml,
            persist=True,
            verbose=False,
        )
        return self._parse(results, with_tracks=True)

    def _parse(self, results, with_tracks: bool) -> list[Detection]:
        out: list[Detection] = []
        names = self.class_names()
        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is None or len(boxes) == 0:
                continue
            xyxy = boxes.xyxy.cpu().numpy()
            confs = boxes.conf.cpu().numpy()
            clss = boxes.cls.cpu().numpy().astype(int)
            ids = None
            if with_tracks and getattr(boxes, "id", None) is not None:
                ids = boxes.id.cpu().numpy().astype(int)
            for i in range(len(boxes)):
                cls_id = int(clss[i])
                cls_name = names.get(cls_id, str(cls_id))
                if not self._keep_class(cls_name):
                    continue
                det = Detection(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=float(confs[i]),
                    x1=float(xyxy[i, 0]),
                    y1=float(xyxy[i, 1]),
                    x2=float(xyxy[i, 2]),
                    y2=float(xyxy[i, 3]),
                    track_id=int(ids[i]) if ids is not None else None,
                )
                out.append(det)
        return out
