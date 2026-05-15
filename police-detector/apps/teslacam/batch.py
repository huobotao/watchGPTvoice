"""Offline TeslaCam batch analyzer.

Walks a TeslaCam directory (typically SavedClips/, SentryClips/, RecentClips/),
processes every MP4 with the same detection pipeline used live, and emits:
    out/<event_id>/<camera>.annotated.mp4
    out/sightings.csv

Usage:
    python apps/teslacam/batch.py --indir /Volumes/TESLACAM/TeslaCam --outdir ./out
    python apps/teslacam/batch.py --indir ./testdata --outdir ./out --jobs 4

Tesla doesn't expose live frames to third parties; this offline mode is the
only supported Tesla integration.
"""

from __future__ import annotations

import argparse
import logging
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core import CSVLogSink, CV2WindowSink, Pipeline, PoliceDetector, default_config  # noqa: E402

log = logging.getLogger("teslacam.batch")

# Tesla camera filename suffixes.
CAMERA_SUFFIXES = ("-front", "-back", "-left_repeater", "-right_repeater")


@dataclass
class ClipJob:
    src: Path
    dst: Path
    camera: str
    event_id: str


def _discover_clips(indir: Path) -> list[ClipJob]:
    jobs: list[ClipJob] = []
    for mp4 in sorted(indir.rglob("*.mp4")):
        camera = "unknown"
        for suffix in CAMERA_SUFFIXES:
            if suffix in mp4.stem:
                camera = suffix.lstrip("-")
                break
        # Use parent dir as event id (Tesla's convention for SavedClips/SentryClips).
        event_id = mp4.parent.name or "root"
        jobs.append(ClipJob(src=mp4, dst=Path(), camera=camera, event_id=event_id))
    return jobs


def _process_one(job: ClipJob, outdir: Path, csv_path: Path) -> tuple[ClipJob, int]:
    import cv2

    cfg = default_config()
    detector = PoliceDetector(cfg)
    sinks = [CV2WindowSink(cfg), CSVLogSink(str(csv_path))]
    pipeline = Pipeline(cfg, detector=detector, sinks=sinks)

    cap = cv2.VideoCapture(str(job.src))
    if not cap.isOpened():
        log.warning("Could not open %s", job.src)
        return job, 0
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    out_clip = outdir / job.event_id / f"{job.src.stem}.annotated.mp4"
    out_clip.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_clip), fourcc, fps, (w, h))

    frame_idx = 0
    n_events = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            t = frame_idx / fps
            out, events = pipeline.step(frame, t=t)
            n_events += len(events)
            writer.write(out)
            frame_idx += 1
    finally:
        cap.release()
        writer.release()
        pipeline.close()
    return job, n_events


def _gather_jobs(indir: Path) -> list[ClipJob]:
    jobs = _discover_clips(indir)
    if not jobs:
        log.warning("No MP4s found under %s", indir)
    return jobs


def main(argv: Iterable[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--indir", type=Path, required=True)
    parser.add_argument("--outdir", type=Path, required=True)
    parser.add_argument("--jobs", type=int, default=1, help="Parallel processes")
    args = parser.parse_args(argv)

    args.outdir.mkdir(parents=True, exist_ok=True)
    csv_path = args.outdir / "sightings.csv"
    # Truncate any prior csv so re-runs are clean.
    if csv_path.exists():
        csv_path.unlink()

    jobs = _gather_jobs(args.indir)
    if not jobs:
        return 1
    log.info("Processing %d clips with %d worker(s)", len(jobs), args.jobs)

    if args.jobs <= 1:
        try:
            from tqdm import tqdm
            iterator = tqdm(jobs)
        except ImportError:
            iterator = jobs
        total_events = 0
        for job in iterator:
            _, n = _process_one(job, args.outdir, csv_path)
            total_events += n
        log.info("Done: %d events across %d clips → %s", total_events, len(jobs), csv_path)
        return 0

    # Parallel: each worker writes to the shared CSV via file-locking provided
    # by the OS on appends. For thousands of clips you'd want a queue; this is
    # adequate for a one-off TeslaCam SD card.
    total_events = 0
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(_process_one, j, args.outdir, csv_path) for j in jobs]
        for fut in as_completed(futures):
            _, n = fut.result()
            total_events += n
    log.info("Done: %d events across %d clips → %s", total_events, len(jobs), csv_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
