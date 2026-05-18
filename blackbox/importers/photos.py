"""相册导入器：递归读图片 EXIF → events。

用法:
    python3 -m blackbox.importers.photos ~/Pictures/iCloud
    python3 -m blackbox.importers.photos /Volumes/Photos --batch 500
"""
from __future__ import annotations

import argparse
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import ExifTags, Image

from ..db import Event, connect, upsert

IMG_EXTS = {".jpg", ".jpeg", ".heic", ".heif", ".png", ".tiff", ".webp"}
VIDEO_EXTS = {".mov", ".mp4", ".m4v"}

_EXIF_TAGS = {v: k for k, v in ExifTags.TAGS.items()}
_GPS_TAGS = {v: k for k, v in ExifTags.GPSTAGS.items()}


def _file_hash(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        while data := f.read(chunk):
            h.update(data)
    return h.hexdigest()


def _gps_to_decimal(coord, ref: str) -> float | None:
    # EXIF GPS 是 ((deg_num, deg_den), (min_num, min_den), (sec_num, sec_den))
    try:
        d, m, s = [float(x) for x in coord]
        val = d + m / 60 + s / 3600
        return -val if ref in ("S", "W") else val
    except Exception:
        return None


def _parse_dt(s: str) -> str | None:
    # EXIF DateTimeOriginal: "2026:05:18 14:23:55"
    try:
        return datetime.strptime(s, "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def _extract_exif(path: Path) -> dict:
    with Image.open(path) as img:
        raw = img._getexif() or {}
    out: dict = {}
    gps_raw = raw.get(_EXIF_TAGS.get("GPSInfo", -1))
    if isinstance(gps_raw, dict):
        lat = _gps_to_decimal(gps_raw.get(_GPS_TAGS["GPSLatitude"]), gps_raw.get(_GPS_TAGS["GPSLatitudeRef"], "N"))
        lon = _gps_to_decimal(gps_raw.get(_GPS_TAGS["GPSLongitude"]), gps_raw.get(_GPS_TAGS["GPSLongitudeRef"], "E"))
        if lat is not None and lon is not None:
            out["lat"], out["lon"] = lat, lon
    dt = raw.get(_EXIF_TAGS.get("DateTimeOriginal", -1)) or raw.get(_EXIF_TAGS.get("DateTime", -1))
    if dt:
        parsed = _parse_dt(dt)
        if parsed:
            out["ts"] = parsed
    for k in ("Make", "Model", "LensModel"):
        v = raw.get(_EXIF_TAGS.get(k, -1))
        if v:
            out[k.lower()] = str(v).strip()
    return out


def iter_photos(root: Path):
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMG_EXTS | VIDEO_EXTS:
            yield p


def to_event(path: Path) -> Event | None:
    suffix = path.suffix.lower()
    is_video = suffix in VIDEO_EXTS
    meta: dict = {}
    if not is_video:
        try:
            meta = _extract_exif(path)
        except Exception as exc:
            meta = {"exif_error": str(exc)}
    # 没有 EXIF 时间就退回到 mtime
    ts = meta.get("ts") or datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    summary_bits = [path.name]
    if "model" in meta:
        summary_bits.append(meta["model"])
    if "lat" in meta:
        summary_bits.append(f"@{meta['lat']:.4f},{meta['lon']:.4f}")
    return Event(
        ts=ts,
        source="photos",
        kind="video" if is_video else "photo",
        external_id=_file_hash(path),
        text=" ".join(summary_bits),
        lat=meta.get("lat"),
        lon=meta.get("lon"),
        media_path=str(path),
        raw={"path": str(path), "size": path.stat().st_size, **meta},
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Import photos & videos into blackbox events.")
    ap.add_argument("root", type=Path, help="root dir to walk recursively")
    ap.add_argument("--batch", type=int, default=200)
    args = ap.parse_args(argv)

    if not args.root.exists():
        print(f"not found: {args.root}", file=sys.stderr)
        return 2

    buf: list[Event] = []
    total = 0
    with connect() as conn:
        for path in iter_photos(args.root):
            ev = to_event(path)
            if ev is None:
                continue
            buf.append(ev)
            if len(buf) >= args.batch:
                total += upsert(conn, buf)
                conn.commit()
                buf.clear()
                print(f"... {total} imported", file=sys.stderr)
        if buf:
            total += upsert(conn, buf)
    print(f"done: {total} events upserted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
