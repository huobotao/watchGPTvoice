from __future__ import annotations

from pathlib import Path
from typing import Sequence

from pydantic import BaseModel, Field


class Config(BaseModel):
    """Tunable thresholds + paths. Edit a copy via Config.model_copy(update=...)."""

    # Model
    model_path: str = "models/police_yolov11n.pt"
    fallback_model: str = "yolov8n.pt"  # COCO; class 'car'/'truck' as crude proxy
    # Class names we treat as "police". atcode11's model uses 'Police Car'; we
    # also accept variants in case of different weight files. Matching is case-
    # insensitive and substring-based.
    police_class_keywords: Sequence[str] = ("police", "patrol", "cruiser")
    peo_class_keywords: Sequence[str] = ("peo", "parking_enforcement", "meter_maid", "go-4", "cushman")
    # When using a generic COCO model as fallback, treat these as "suspect police".
    coco_fallback_class_keywords: Sequence[str] = ("car",)

    # Detection
    confidence_threshold: float = 0.55
    iou_threshold: float = 0.5
    imgsz: int = 640

    # Tracking
    tracker_yaml: str = "bytetrack.yaml"

    # Approach
    approach_window_frames: int = 15
    approach_min_samples: int = 5
    approach_growth_threshold: float = 0.02  # dw/dt / w per second
    approach_hysteresis: float = 0.005

    # Flash
    flash_window_frames: int = 45  # ~1.5s at 30fps
    flash_min_peaks: int = 2
    flash_peak_distance_frames: int = 3
    flash_peak_prominence_ratio: float = 1.0  # times baseline std
    # Top fraction of bbox where lightbar usually sits.
    flash_roi_top_fraction: float = 0.4

    # Alerter
    alert_cooldown_seconds: float = 5.0
    alert_audio_path: str = "assets/beep.wav"
    alert_audio_high_path: str = "assets/beep_high.wav"

    # Drawing
    draw_track_history: int = 10

    base_dir: str = Field(default_factory=lambda: str(Path(__file__).resolve().parent.parent))

    def resolve(self, rel: str) -> str:
        p = Path(rel)
        if p.is_absolute():
            return str(p)
        return str(Path(self.base_dir) / p)


def default_config() -> Config:
    return Config()
