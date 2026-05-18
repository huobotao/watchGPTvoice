"""SQLite 连接与幂等 upsert。所有 importer 走这层。"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Iterator

DB_PATH = Path(os.environ.get("BLACKBOX_DB", Path.home() / "blackbox" / "blackbox.db"))
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


@dataclass
class Event:
    ts: str
    source: str
    kind: str
    external_id: str
    text: str | None = None
    lat: float | None = None
    lon: float | None = None
    media_path: str | None = None
    raw: dict | None = None


def init(db_path: Path = DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA_PATH.read_text())


@contextmanager
def connect(db_path: Path = DB_PATH) -> Iterator[sqlite3.Connection]:
    if not db_path.exists():
        init(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert(conn: sqlite3.Connection, events: Iterable[Event]) -> int:
    """ON CONFLICT (source, external_id) DO UPDATE：源数据修正后重导即可覆盖。"""
    rows = [
        (
            e.ts, e.source, e.kind, e.external_id,
            e.text, e.lat, e.lon, e.media_path,
            json.dumps(e.raw, ensure_ascii=False) if e.raw is not None else None,
        )
        for e in events
    ]
    if not rows:
        return 0
    conn.executemany(
        """
        INSERT INTO events (ts, source, kind, external_id, text, lat, lon, media_path, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (source, external_id) DO UPDATE SET
            ts = excluded.ts,
            kind = excluded.kind,
            text = excluded.text,
            lat = excluded.lat,
            lon = excluded.lon,
            media_path = excluded.media_path,
            raw_json = excluded.raw_json
        """,
        rows,
    )
    return len(rows)
