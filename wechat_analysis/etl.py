"""ETL: parse external WeChat exports → canonical Message rows → SQLite store.

Input formats supported (MVP):
  - JSONL : one Message-shaped JSON object per line
  - CSV   : columns matching Message fields (extra as JSON string)

Adapters for vendor-specific formats (MemoTrace, WeChatTweak, etc.) should
convert to canonical JSONL first and be added under wechat_analysis/adapters/.
"""
from __future__ import annotations

import csv
import json
import sqlite3
from collections.abc import Iterable, Iterator
from datetime import datetime
from pathlib import Path
from typing import Any

from .schema import Message

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           TEXT    NOT NULL,
    peer_id      TEXT    NOT NULL,
    peer_name    TEXT    NOT NULL,
    peer_type    TEXT    NOT NULL,
    direction    TEXT    NOT NULL,
    sender_id    TEXT    NOT NULL,
    sender_name  TEXT    NOT NULL,
    msg_type     TEXT    NOT NULL,
    text         TEXT    NOT NULL DEFAULT '',
    duration_sec REAL,
    amount       REAL,
    extra_json   TEXT    NOT NULL DEFAULT '{}',
    dedup_key    TEXT    NOT NULL,
    UNIQUE(dedup_key)
);
CREATE INDEX IF NOT EXISTS idx_msg_peer_ts ON messages(peer_id, ts);
CREATE INDEX IF NOT EXISTS idx_msg_ts      ON messages(ts);
"""


def _parse_ts(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        # epoch seconds or ms — accept both
        ts = float(value)
        if ts > 1e12:
            ts /= 1000.0
        return datetime.fromtimestamp(ts).astimezone()
    if isinstance(value, str):
        # accept ISO 8601 or "YYYY-MM-DD HH:MM:SS"
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        if dt.tzinfo is None:
            dt = dt.astimezone()
        return dt
    raise ValueError(f"cannot parse ts: {value!r}")


def _record_to_message(rec: dict[str, Any]) -> Message:
    extra = rec.get("extra")
    if isinstance(extra, str):
        extra = json.loads(extra) if extra else {}
    msg = Message(
        ts=_parse_ts(rec["ts"]),
        peer_id=str(rec["peer_id"]),
        peer_name=str(rec.get("peer_name") or rec["peer_id"]),
        peer_type=str(rec.get("peer_type") or "private"),
        direction=str(rec["direction"]),
        sender_id=str(rec.get("sender_id") or ("self" if rec["direction"] == "out" else rec["peer_id"])),
        sender_name=str(rec.get("sender_name") or rec.get("peer_name") or rec["peer_id"]),
        msg_type=str(rec.get("msg_type") or "text"),
        text=str(rec.get("text") or ""),
        duration_sec=(float(rec["duration_sec"]) if rec.get("duration_sec") not in (None, "") else None),
        amount=(float(rec["amount"]) if rec.get("amount") not in (None, "") else None),
        extra=extra or {},
    )
    msg.validate()
    return msg


def read_jsonl(path: Path) -> Iterator[Message]:
    with path.open("r", encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield _record_to_message(json.loads(line))
            except Exception as e:
                raise ValueError(f"{path}:{ln}: {e}") from e


def read_csv(path: Path) -> Iterator[Message]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, 2):
            try:
                yield _record_to_message(row)
            except Exception as e:
                raise ValueError(f"{path}:{i}: {e}") from e


def read_any(path: Path) -> Iterator[Message]:
    suffix = path.suffix.lower()
    if suffix in (".jsonl", ".ndjson"):
        return read_jsonl(path)
    if suffix == ".csv":
        return read_csv(path)
    raise ValueError(f"unsupported input format: {suffix}")


def _dedup_key(m: Message) -> str:
    # stable across reruns; tolerates the same source replayed
    return f"{m.ts.isoformat()}|{m.peer_id}|{m.direction}|{m.sender_id}|{hash(m.text) & 0xFFFFFFFF}"


def open_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_SQL)
    return conn


def ingest(messages: Iterable[Message], conn: sqlite3.Connection) -> tuple[int, int]:
    """Insert messages. Returns (inserted, skipped_duplicates)."""
    inserted = skipped = 0
    cur = conn.cursor()
    for m in messages:
        try:
            cur.execute(
                """INSERT INTO messages
                   (ts, peer_id, peer_name, peer_type, direction, sender_id,
                    sender_name, msg_type, text, duration_sec, amount,
                    extra_json, dedup_key)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    m.ts.isoformat(),
                    m.peer_id, m.peer_name, m.peer_type, m.direction,
                    m.sender_id, m.sender_name, m.msg_type, m.text,
                    m.duration_sec, m.amount,
                    json.dumps(m.extra, ensure_ascii=False),
                    _dedup_key(m),
                ),
            )
            inserted += 1
        except sqlite3.IntegrityError:
            skipped += 1
    conn.commit()
    return inserted, skipped


def ingest_path(input_path: Path, db_path: Path) -> tuple[int, int]:
    conn = open_db(db_path)
    try:
        return ingest(read_any(input_path), conn)
    finally:
        conn.close()
