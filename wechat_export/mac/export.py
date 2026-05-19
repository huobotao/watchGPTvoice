#!/usr/bin/env python3
"""
End-to-end: discover Mac WeChat DBs → decrypt all → parse messages → write JSONL.

Usage:
  python3 export.py                     # full export
  python3 export.py --stats-only        # decrypt + stats, no message dump
  python3 export.py --account 0         # pick account by index from find_dbs.py
  python3 export.py --out ./out         # output directory
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import shutil
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from decrypt import load_key, decrypt_db
from find_dbs import discover_accounts, WeChatAccount

# WeChat Mac message type ints -> our normalized type names.
TYPE_MAP = {
    1: "text",
    3: "image",
    34: "voice",
    42: "card",
    43: "video",
    47: "emoji",
    48: "location",
    49: "appmsg",     # subtype lives in msgContent XML
    50: "voip",
    62: "video",      # legacy small video
    10000: "sysmsg",
    10002: "sysmsg",
}


def normalize_row(row: sqlite3.Row, source_db: str, self_id: str | None) -> dict:
    """Map a Mac WeChat Chat_*.db row to our schema."""
    raw_type = row["mesType"] if "mesType" in row.keys() else row["Type"]
    msg_id = f"mac:{Path(source_db).stem}:{row['mesLocalID']}"
    ts = int(row["msgCreateTime"])
    # mesDes: 0 = sent by me, 1 = received
    is_self = (row["mesDes"] == 0)
    return {
        "msg_id": msg_id,
        "session": row["msgContent"][:0] or "",   # filled by caller (table name == session hash)
        "session_name": None,
        "sender": "self" if is_self else (row["msgSource"] or ""),
        "sender_name": None,
        "timestamp": ts,
        "type": TYPE_MAP.get(raw_type, "unknown"),
        "content": row["msgContent"] or "",
        "media_path": None,
        "source": "mac",
        "raw_type": raw_type,
    }


def list_chat_tables(plain_db: Path) -> list[str]:
    conn = sqlite3.connect(plain_db)
    try:
        cur = conn.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name LIKE 'Chat\\_%' ESCAPE '\\'"
        )
        return [r[0] for r in cur.fetchall()]
    finally:
        conn.close()


def iter_messages(plain_db: Path):
    """Yield (chat_table, row) for every message in a decrypted msg_*.db."""
    conn = sqlite3.connect(plain_db)
    conn.row_factory = sqlite3.Row
    try:
        tables = list_chat_tables(plain_db)
        for t in tables:
            try:
                cur = conn.execute(f"SELECT * FROM \"{t}\" ORDER BY msgCreateTime")
                for row in cur:
                    yield t, row
            except sqlite3.DatabaseError as e:
                print(f"  [!] skipping {t}: {e}", file=sys.stderr)
    finally:
        conn.close()


def session_from_table(table_name: str) -> str:
    """Chat_<hash> -> opaque session id. Real wxid lookup needs WCDB_Contact."""
    return table_name[len("Chat_"):]


def load_contact_map(contact_plain_db: Path) -> dict[str, str]:
    """hash(wxid) -> displayName, if we can decrypt the contact DB."""
    if not contact_plain_db.exists():
        return {}
    conn = sqlite3.connect(contact_plain_db)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            "SELECT m_nsUsrName AS wxid, "
            "       COALESCE(nickname, m_nsRemark, m_nsUsrName) AS name "
            "FROM WCContact"
        )
        out = {}
        import hashlib
        for r in cur:
            wxid = r["wxid"]
            h = hashlib.md5(wxid.encode()).hexdigest()
            out[h] = (r["name"], wxid)
        return out
    except sqlite3.DatabaseError as e:
        print(f"  [!] contact table read failed: {e}", file=sys.stderr)
        return {}
    finally:
        conn.close()


def export_account(acc: WeChatAccount, out_dir: Path, key: str, stats_only: bool = False) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    plain_dir = out_dir / "_plain"
    plain_dir.mkdir(exist_ok=True)

    # Decrypt all msg_*.db and the contact DB
    print(f"[*] Decrypting {len(acc.msg_dbs)} message DB(s)...")
    plain_dbs: list[Path] = []
    for src in acc.msg_dbs:
        src_p = Path(src)
        dst = plain_dir / (src_p.stem + ".plain.db")
        if not dst.exists():
            decrypt_db(src_p, dst, key)
        plain_dbs.append(dst)
        print(f"    ok  {src_p.name}")

    contact_plain = None
    if acc.contact_db:
        contact_plain = plain_dir / "WCDB_Contact.plain.db"
        if not contact_plain.exists():
            decrypt_db(Path(acc.contact_db), contact_plain, key)
        print(f"    ok  WCDB_Contact.sqlite")

    contact_map = load_contact_map(contact_plain) if contact_plain else {}

    # Pass 1: stats
    total = 0
    by_type: Counter = Counter()
    by_session: Counter = Counter()
    by_month: Counter = Counter()
    earliest, latest = None, None

    jsonl_path = out_dir / "messages.jsonl"
    fp = None
    if not stats_only:
        fp = jsonl_path.open("w")

    for plain in plain_dbs:
        for chat_table, row in iter_messages(plain):
            session_hash = session_from_table(chat_table)
            name, wxid = contact_map.get(session_hash, (None, None))
            rec = normalize_row(row, str(plain), self_id=None)
            rec["session"] = wxid or session_hash
            rec["session_name"] = name

            total += 1
            by_type[rec["type"]] += 1
            by_session[rec["session_name"] or rec["session"]] += 1
            ts = rec["timestamp"]
            if earliest is None or ts < earliest:
                earliest = ts
            if latest is None or ts > latest:
                latest = ts
            by_month[datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m")] += 1

            if fp:
                fp.write(json.dumps(rec, ensure_ascii=False) + "\n")

    if fp:
        fp.close()

    stats = {
        "account_root": acc.root,
        "total_messages": total,
        "earliest": datetime.fromtimestamp(earliest, tz=timezone.utc).isoformat() if earliest else None,
        "latest": datetime.fromtimestamp(latest, tz=timezone.utc).isoformat() if latest else None,
        "by_type": dict(by_type),
        "by_month": dict(sorted(by_month.items())),
        "top_sessions": by_session.most_common(20),
        "session_count": len(by_session),
    }
    (out_dir / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2))
    return stats


def print_stats(s: dict) -> None:
    print(f"\n=== Export summary ===")
    print(f"  account     : {s['account_root']}")
    print(f"  total msgs  : {s['total_messages']:,}")
    print(f"  date range  : {s['earliest']}  →  {s['latest']}")
    print(f"  sessions    : {s['session_count']:,}")
    print(f"  by type     :")
    for t, n in sorted(s["by_type"].items(), key=lambda x: -x[1]):
        print(f"    {t:10s} {n:>10,}")
    print(f"  top sessions:")
    for name, n in s["top_sessions"][:10]:
        print(f"    {n:>8,}  {name}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", type=int, default=None,
                    help="Index from find_dbs.py output (default: pick the one with most msgs)")
    ap.add_argument("--out", default="./out", help="Output directory")
    ap.add_argument("--key", help="Override key (else loaded from .wechat_key)")
    ap.add_argument("--stats-only", action="store_true", help="Skip JSONL dump, just count")
    args = ap.parse_args()

    accounts = discover_accounts()
    if not accounts:
        print("[!] No WeChat data found. Run find_dbs.py for details.", file=sys.stderr)
        return 1

    if args.account is not None:
        if args.account >= len(accounts):
            print(f"[!] account index {args.account} out of range (have {len(accounts)})", file=sys.stderr)
            return 1
        chosen = accounts[args.account]
    else:
        chosen = max(accounts, key=lambda a: len(a.msg_dbs))
        print(f"[*] Auto-picked account with {len(chosen.msg_dbs)} msg DBs: {chosen.root}")

    key = load_key(args.key)
    stats = export_account(chosen, Path(args.out), key, stats_only=args.stats_only)
    print_stats(stats)
    if not args.stats_only:
        print(f"\n  jsonl       : {args.out}/messages.jsonl")
    return 0


if __name__ == "__main__":
    sys.exit(main())
