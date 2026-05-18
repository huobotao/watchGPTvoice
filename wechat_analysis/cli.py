"""CLI entry: python -m wechat_analysis <command>."""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

from . import __version__
from .etl import ingest_path, open_db
from .profile import build_profiles, render_peer_md, write_outputs


def cmd_ingest(args: argparse.Namespace) -> int:
    in_path = Path(args.input)
    db_path = Path(args.db)
    if not in_path.exists():
        print(f"input not found: {in_path}", file=sys.stderr)
        return 2
    inserted, skipped = ingest_path(in_path, db_path)
    print(f"ingested: {inserted} inserted, {skipped} duplicates skipped → {db_path}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    db_path = Path(args.db)
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        """SELECT peer_id, MAX(peer_name), MAX(peer_type), COUNT(*),
                  MIN(ts), MAX(ts)
           FROM messages GROUP BY peer_id ORDER BY COUNT(*) DESC"""
    ).fetchall()
    conn.close()
    if not rows:
        print("(no messages)")
        return 0
    print(f"{'peer_id':<24} {'type':<8} {'count':>7}  first → last")
    for pid, pname, ptype, cnt, fts, lts in rows:
        print(f"{(pname or pid)[:22]:<24} {ptype:<8} {cnt:>7}  {fts[:10]} → {lts[:10]}")
    return 0


def cmd_profile(args: argparse.Namespace) -> int:
    db_path = Path(args.db)
    if not db_path.exists():
        print(f"db not found: {db_path}", file=sys.stderr)
        return 2
    profiles = build_profiles(db_path)
    if args.peer:
        match = [p for p in profiles if args.peer in (p.peer_id, p.peer_name)]
        if not match:
            print(f"no peer matched: {args.peer}", file=sys.stderr)
            return 1
        for p in match:
            if args.format == "json":
                from dataclasses import asdict
                print(json.dumps(asdict(p), ensure_ascii=False, indent=2))
            else:
                print(render_peer_md(p))
        return 0
    out_dir = Path(args.out)
    write_outputs(profiles, out_dir)
    print(f"wrote {len(profiles)} profiles to {out_dir}/")
    print(f"  - {out_dir}/overview.md")
    print(f"  - {out_dir}/profiles.json")
    print(f"  - {out_dir}/cards/*.md")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="wechat_analysis",
        description="Local WeChat chat-log analysis (MVP).",
    )
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("ingest", help="parse export file → SQLite store")
    pi.add_argument("--input", required=True, help="path to .jsonl/.ndjson/.csv")
    pi.add_argument("--db", default="events.db", help="sqlite db path")
    pi.set_defaults(func=cmd_ingest)

    pl = sub.add_parser("list", help="list peers in the store")
    pl.add_argument("--db", default="events.db")
    pl.set_defaults(func=cmd_list)

    pp = sub.add_parser("profile", help="build per-peer profiles")
    pp.add_argument("--db", default="events.db")
    pp.add_argument("--out", default="profiles_out", help="output directory")
    pp.add_argument("--peer", help="print a single peer to stdout (id or name)")
    pp.add_argument("--format", choices=["md", "json"], default="md")
    pp.set_defaults(func=cmd_profile)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
