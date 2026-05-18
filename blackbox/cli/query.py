"""按时间/源/关键词过滤事件，输出 Markdown。

用法:
    python3 -m blackbox.cli.query --since 7d
    python3 -m blackbox.cli.query --since 2026-05-01 --until 2026-05-10 --source photos
    python3 -m blackbox.cli.query --search "机场"
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from typing import Iterable

from ..db import connect

_REL = re.compile(r"^(\d+)([hdw])$")


def parse_when(s: str) -> str:
    """支持 '7d' / '3h' / '2w' / ISO 日期。返回 ISO8601 UTC。"""
    if m := _REL.match(s):
        n, unit = int(m.group(1)), m.group(2)
        delta = {"h": timedelta(hours=n), "d": timedelta(days=n), "w": timedelta(weeks=n)}[unit]
        return (datetime.now(timezone.utc) - delta).isoformat()
    # 容忍 '2026-05-18' 这种纯日期
    if len(s) == 10:
        return f"{s}T00:00:00+00:00"
    return s


def fetch(
    conn: sqlite3.Connection,
    since: str | None = None,
    until: str | None = None,
    source: str | None = None,
    search: str | None = None,
    limit: int = 1000,
) -> list[sqlite3.Row]:
    where, params = [], []
    if since:
        where.append("ts >= ?"); params.append(parse_when(since))
    if until:
        where.append("ts <= ?"); params.append(parse_when(until))
    if source:
        where.append("source = ?"); params.append(source)

    if search:
        # 用 FTS5 做关键词匹配，再 join 回主表
        sql = """
            SELECT e.* FROM events e
            JOIN events_fts f ON f.rowid = e.id
            WHERE events_fts MATCH ?
        """
        params = [search] + params
        if where:
            sql += " AND " + " AND ".join(where)
    else:
        sql = "SELECT * FROM events"
        if where:
            sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY ts ASC LIMIT ?"
    params.append(limit)
    return list(conn.execute(sql, params))


def to_markdown(rows: Iterable[sqlite3.Row]) -> str:
    out = ["# Events", ""]
    for r in rows:
        loc = f" @{r['lat']:.4f},{r['lon']:.4f}" if r["lat"] is not None else ""
        out.append(f"- **{r['ts']}** [{r['source']}/{r['kind']}]{loc} — {r['text'] or ''}")
        if r["media_path"]:
            out.append(f"  - `{r['media_path']}`")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since")
    ap.add_argument("--until")
    ap.add_argument("--source")
    ap.add_argument("--search")
    ap.add_argument("--limit", type=int, default=1000)
    args = ap.parse_args(argv)

    with connect() as conn:
        rows = fetch(conn, args.since, args.until, args.source, args.search, args.limit)
    print(to_markdown(rows))
    print(f"\n<!-- {len(rows)} events -->", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
