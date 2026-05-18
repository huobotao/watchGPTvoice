"""Per-contact profile builder.

Reads messages from the SQLite store and produces, for every peer:
  - identity (name, type)
  - lifecycle (first/last ts, span days, longest silent gap)
  - volume (totals, in/out, initiation ratio, msg-type breakdown)
  - rhythm (night ratio, weekend ratio, top weeks)
  - dialog dynamics (median reply delay for private chats)
  - economy (transfer/redpacket flows)
  - recent trend (last 30 days vs prior 30 days)

Pure-stdlib; no NLP yet. Plugs into later layers (timeline, graph).
"""
from __future__ import annotations

import json
import sqlite3
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

NIGHT_START_HOUR = 23   # >= 23:00
NIGHT_END_HOUR = 6      # < 06:00


@dataclass
class PeerProfile:
    peer_id: str
    peer_name: str
    peer_type: str
    first_ts: str
    last_ts: str
    span_days: int
    total_messages: int
    in_count: int
    out_count: int
    initiation_ratio: float           # out / total
    msg_type_breakdown: dict[str, int]
    avg_in_chars: float
    avg_out_chars: float
    median_reply_delay_sec: float | None
    night_ratio: float
    weekend_ratio: float
    longest_silent_gap_days: int
    top_weeks: list[dict[str, Any]]   # [{week: "2025-W12", count: N}, ...]
    transfer_in_total: float
    transfer_out_total: float
    transfer_count: int
    last_30d_count: int
    prior_30d_count: int
    trend: str                        # rising | falling | stable | new | dormant
    notable_firsts: dict[str, str] = field(default_factory=dict)


def _iso_week(dt: datetime) -> str:
    y, w, _ = dt.isocalendar()
    return f"{y}-W{w:02d}"


def _safe_mean(xs: list[float]) -> float:
    return float(statistics.fmean(xs)) if xs else 0.0


def _classify_trend(last: int, prior: int) -> str:
    if last == 0 and prior == 0:
        return "dormant"
    if prior == 0:
        return "new"
    if last == 0:
        return "dormant"
    ratio = last / prior
    if ratio >= 1.3:
        return "rising"
    if ratio <= 0.7:
        return "falling"
    return "stable"


def _build_one(peer_id: str, peer_name: str, peer_type: str,
               rows: list[tuple], now: datetime) -> PeerProfile:
    # rows: (ts_iso, direction, sender_id, msg_type, text, amount)
    times: list[datetime] = []
    in_count = out_count = 0
    in_chars: list[int] = []
    out_chars: list[int] = []
    types = Counter()
    night = weekend = 0
    transfer_in = transfer_out = 0.0
    transfer_count = 0
    week_counter: Counter[str] = Counter()
    last_in_ts: datetime | None = None
    reply_delays: list[float] = []
    firsts: dict[str, str] = {}

    for ts_iso, direction, sender_id, msg_type, text, amount in rows:
        ts = datetime.fromisoformat(ts_iso)
        times.append(ts)
        types[msg_type] += 1
        week_counter[_iso_week(ts)] += 1

        h = ts.hour
        if h >= NIGHT_START_HOUR or h < NIGHT_END_HOUR:
            night += 1
        if ts.weekday() >= 5:
            weekend += 1

        if direction == "in":
            in_count += 1
            in_chars.append(len(text or ""))
            last_in_ts = ts
            firsts.setdefault(f"first_in_{msg_type}", ts_iso)
        else:
            out_count += 1
            out_chars.append(len(text or ""))
            firsts.setdefault(f"first_out_{msg_type}", ts_iso)
            if last_in_ts is not None:
                delay = (ts - last_in_ts).total_seconds()
                if 0 <= delay <= 7 * 86400:   # ignore week+ gaps as "replies"
                    reply_delays.append(delay)
                last_in_ts = None  # one reply per inbound burst

        if msg_type in ("transfer", "redpacket") and amount is not None:
            transfer_count += 1
            if direction == "in":
                transfer_in += float(amount)
            else:
                transfer_out += float(amount)

    times.sort()
    first_ts = times[0]
    last_ts = times[-1]
    span_days = max(1, (last_ts - first_ts).days)

    # longest silent gap
    longest_gap = 0
    for a, b in zip(times, times[1:]):
        gap = (b - a).days
        if gap > longest_gap:
            longest_gap = gap

    # last 30d vs prior 30d (relative to dataset's last_ts so it's reproducible)
    cutoff_recent = last_ts - timedelta(days=30)
    cutoff_prior = last_ts - timedelta(days=60)
    last_30 = sum(1 for t in times if t > cutoff_recent)
    prior_30 = sum(1 for t in times if cutoff_prior < t <= cutoff_recent)

    total = in_count + out_count
    return PeerProfile(
        peer_id=peer_id,
        peer_name=peer_name,
        peer_type=peer_type,
        first_ts=first_ts.isoformat(),
        last_ts=last_ts.isoformat(),
        span_days=span_days,
        total_messages=total,
        in_count=in_count,
        out_count=out_count,
        initiation_ratio=round(out_count / total, 3) if total else 0.0,
        msg_type_breakdown=dict(types.most_common()),
        avg_in_chars=round(_safe_mean([float(x) for x in in_chars]), 1),
        avg_out_chars=round(_safe_mean([float(x) for x in out_chars]), 1),
        median_reply_delay_sec=(
            round(float(statistics.median(reply_delays)), 1) if reply_delays else None
        ),
        night_ratio=round(night / total, 3) if total else 0.0,
        weekend_ratio=round(weekend / total, 3) if total else 0.0,
        longest_silent_gap_days=longest_gap,
        top_weeks=[
            {"week": w, "count": c}
            for w, c in week_counter.most_common(3)
        ],
        transfer_in_total=round(transfer_in, 2),
        transfer_out_total=round(transfer_out, 2),
        transfer_count=transfer_count,
        last_30d_count=last_30,
        prior_30d_count=prior_30,
        trend=_classify_trend(last_30, prior_30),
        notable_firsts=firsts,
    )


def build_profiles(db_path: Path) -> list[PeerProfile]:
    conn = sqlite3.connect(db_path)
    try:
        peers = conn.execute(
            """SELECT peer_id,
                      MAX(peer_name) AS peer_name,
                      MAX(peer_type) AS peer_type
               FROM messages GROUP BY peer_id"""
        ).fetchall()
        now = datetime.now(timezone.utc)
        out: list[PeerProfile] = []
        for peer_id, peer_name, peer_type in peers:
            rows = conn.execute(
                """SELECT ts, direction, sender_id, msg_type, text, amount
                   FROM messages WHERE peer_id = ? ORDER BY ts ASC""",
                (peer_id,),
            ).fetchall()
            if not rows:
                continue
            out.append(_build_one(peer_id, peer_name, peer_type, rows, now))
        out.sort(key=lambda p: p.total_messages, reverse=True)
        return out
    finally:
        conn.close()


def render_overview_md(profiles: list[PeerProfile]) -> str:
    lines = ["# 联系人画像总览", ""]
    lines.append(f"共 {len(profiles)} 个联系人/群。按消息量降序。")
    lines.append("")
    lines.append("| 联系人 | 类型 | 总消息 | 主动比 | 深夜% | 趋势 | 最近30天 | 最近一次 |")
    lines.append("|---|---|---:|---:|---:|---|---:|---|")
    for p in profiles:
        lines.append(
            f"| {p.peer_name} | {p.peer_type} | {p.total_messages} | "
            f"{p.initiation_ratio:.2f} | {p.night_ratio*100:.0f}% | "
            f"{p.trend} | {p.last_30d_count} | {p.last_ts[:10]} |"
        )
    lines.append("")
    return "\n".join(lines)


def render_peer_md(p: PeerProfile) -> str:
    L = [f"# {p.peer_name}", ""]
    L.append(f"- ID: `{p.peer_id}`   类型: **{p.peer_type}**")
    L.append(f"- 关系跨度: **{p.first_ts[:10]} → {p.last_ts[:10]}**（{p.span_days} 天）")
    L.append(f"- 总消息: **{p.total_messages}**  ·  收 {p.in_count} / 发 {p.out_count}  ·  主动比 **{p.initiation_ratio:.2f}**")
    L.append(f"- 平均长度: 收 {p.avg_in_chars} 字 / 发 {p.avg_out_chars} 字")
    if p.median_reply_delay_sec is not None:
        mins = p.median_reply_delay_sec / 60
        L.append(f"- 中位回复延迟: **{mins:.1f} 分钟**")
    L.append(f"- 深夜消息占比: **{p.night_ratio*100:.0f}%**  ·  周末占比: {p.weekend_ratio*100:.0f}%")
    L.append(f"- 最长沉默: **{p.longest_silent_gap_days} 天**")
    if p.transfer_count:
        L.append(f"- 转账/红包: **{p.transfer_count} 次**  ·  收 ¥{p.transfer_in_total}  发 ¥{p.transfer_out_total}")
    L.append(f"- 近 30 天 / 前 30 天: **{p.last_30d_count} / {p.prior_30d_count}**  →  **{p.trend}**")
    if p.top_weeks:
        weeks = ", ".join(f"{w['week']}({w['count']})" for w in p.top_weeks)
        L.append(f"- 高峰周: {weeks}")
    if p.msg_type_breakdown:
        types = ", ".join(f"{k} {v}" for k, v in p.msg_type_breakdown.items())
        L.append(f"- 消息类型: {types}")
    L.append("")
    return "\n".join(L)


def write_outputs(profiles: list[PeerProfile], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    # combined JSON
    (out_dir / "profiles.json").write_text(
        json.dumps([asdict(p) for p in profiles], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    # overview markdown
    (out_dir / "overview.md").write_text(render_overview_md(profiles), encoding="utf-8")
    # per-peer markdown cards
    cards_dir = out_dir / "cards"
    cards_dir.mkdir(exist_ok=True)
    for p in profiles:
        safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in p.peer_id)
        (cards_dir / f"{safe}.md").write_text(render_peer_md(p), encoding="utf-8")
