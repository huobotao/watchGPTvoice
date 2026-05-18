"""Canonical message schema.

All ETL adapters must produce records that match this shape before they are
written into the events store. Keep fields stable — downstream analysis
(profile, timeline, graph) depends on them.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

MSG_TYPES = {
    "text", "image", "voice", "video", "file", "sticker",
    "transfer", "redpacket", "location", "link", "card", "system", "other",
}

PEER_TYPES = {"private", "group"}
DIRECTIONS = {"in", "out"}


@dataclass
class Message:
    ts: datetime
    peer_id: str
    peer_name: str
    peer_type: str               # private | group
    direction: str               # in | out
    sender_id: str               # "self" for outgoing; peer/group-member for incoming
    sender_name: str
    msg_type: str                # see MSG_TYPES
    text: str = ""               # transcribed/extracted text; may be empty for media
    duration_sec: float | None = None
    amount: float | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if self.peer_type not in PEER_TYPES:
            raise ValueError(f"peer_type {self.peer_type!r} not in {PEER_TYPES}")
        if self.direction not in DIRECTIONS:
            raise ValueError(f"direction {self.direction!r} not in {DIRECTIONS}")
        if self.msg_type not in MSG_TYPES:
            raise ValueError(f"msg_type {self.msg_type!r} not in {MSG_TYPES}")
        if not isinstance(self.ts, datetime):
            raise ValueError("ts must be datetime")
        if self.ts.tzinfo is None:
            # require tz-aware to keep night/weekend logic consistent
            raise ValueError("ts must be timezone-aware")

    def to_row(self) -> dict[str, Any]:
        d = asdict(self)
        d["ts"] = self.ts.astimezone(timezone.utc).isoformat()
        d["extra"] = self.extra or {}
        return d

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "Message":
        ts = row["ts"]
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        return cls(
            ts=ts,
            peer_id=row["peer_id"],
            peer_name=row["peer_name"],
            peer_type=row["peer_type"],
            direction=row["direction"],
            sender_id=row["sender_id"],
            sender_name=row["sender_name"],
            msg_type=row["msg_type"],
            text=row.get("text", "") or "",
            duration_sec=row.get("duration_sec"),
            amount=row.get("amount"),
            extra=row.get("extra") or {},
        )
