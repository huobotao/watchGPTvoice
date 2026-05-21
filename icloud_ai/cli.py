"""CLI entry point.

Usage:
    icloud-ai extract --source all
    icloud-ai ask "去年和谁去过日本"
    icloud-ai analyze relationships --provider anthropic

Also runnable via:  python -m icloud_ai ...
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from . import extract, qa
from .providers import make_provider


def _default_workspace() -> Path:
    return Path(os.environ.get("ICLOUD_AI_HOME", Path.home() / ".icloud_ai"))


def cmd_extract(args: argparse.Namespace) -> None:
    ws = Path(args.workspace)
    ws.mkdir(parents=True, exist_ok=True)
    sources = ["photos", "contacts", "calendar"] if "all" in args.source else args.source

    for src in sources:
        out = ws / f"{src}.jsonl"
        print(f"==> extracting {src} -> {out}")
        if src == "photos":
            n = extract.extract_photos(out, limit=args.limit)
        elif src == "contacts":
            n = extract.extract_contacts(out)
        elif src == "calendar":
            n = extract.extract_calendar(out)
        else:
            print(f"unknown source: {src}", file=sys.stderr)
            sys.exit(2)
        print(f"   wrote {n} rows")


def cmd_ask(args: argparse.Namespace) -> None:
    provider = make_provider(args.provider, args.model)
    print(qa.ask(provider, Path(args.workspace), args.question, limit=args.limit))


def cmd_analyze(args: argparse.Namespace) -> None:
    provider = make_provider(args.provider, args.model)
    print(qa.analyze(provider, Path(args.workspace), args.kind, limit=args.limit))


def _add_llm_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--provider", default="anthropic",
                   choices=["openai", "anthropic", "ollama"])
    p.add_argument("--model", default=None,
                   help="model id (defaults: claude-opus-4-7 / gpt-4o / llama3.1:8b)")
    p.add_argument("--limit", type=int, default=None,
                   help="cap rows per kind when stuffing into context")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(
        prog="icloud-ai",
        description="Query your iCloud-synced macOS Photos / Contacts / Calendar with an LLM.",
    )
    p.add_argument("--workspace", default=str(_default_workspace()),
                   help="dir for JSONL data (default: ~/.icloud_ai or $ICLOUD_AI_HOME)")
    sub = p.add_subparsers(dest="cmd", required=True)

    e = sub.add_parser("extract", help="dump local data into JSONL")
    e.add_argument("--source", nargs="+", default=["all"],
                   choices=["all", "photos", "contacts", "calendar"])
    e.add_argument("--limit", type=int, default=None,
                   help="cap rows per source (useful for testing)")
    e.set_defaults(func=cmd_extract)

    a = sub.add_parser("ask", help="free-form question over the corpus")
    a.add_argument("question")
    _add_llm_args(a)
    a.set_defaults(func=cmd_ask)

    z = sub.add_parser("analyze", help="run a preset 'one-click' analysis")
    z.add_argument("kind", choices=list(qa.ANALYSES.keys()),
                   help="relationships | timeline | social | trajectory | history")
    _add_llm_args(z)
    z.set_defaults(func=cmd_analyze)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
