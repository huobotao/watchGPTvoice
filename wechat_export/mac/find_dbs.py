#!/usr/bin/env python3
"""
Locate WeChat for Mac's data directory and enumerate encrypted SQLite databases.

WeChat versions over the years have stored data in several locations:
  - ~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/<ver>/<hash>/
  - ~/Library/Application Support/com.tencent.xinWeChat/<ver>/<hash>/
  - ~/Library/Group Containers/group.com.tencent.xinWeChat/...

Within an account's folder there are message DBs (msg_0.db ... msg_N.db),
a contact DB (WCDB_Contact.sqlite), and asset folders (Image/, Video/, Voice/, ...).
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from dataclasses import dataclass, asdict

HOME = Path.home()
SEARCH_ROOTS = [
    HOME / "Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat",
    HOME / "Library/Application Support/com.tencent.xinWeChat",
    HOME / "Library/Group Containers/group.com.tencent.xinWeChat",
]
ACCOUNT_HASH_RE = re.compile(r"^[0-9a-f]{32}$")


@dataclass
class WeChatAccount:
    root: str                # account folder
    version_dir: str         # e.g. "2.0b4.0.9"
    msg_dbs: list[str]       # paths to msg_*.db
    contact_db: str | None
    media_dirs: dict[str, str]   # name -> path (Image, Video, Voice, OpenData, ...)


def discover_accounts() -> list[WeChatAccount]:
    found: list[WeChatAccount] = []
    for root in SEARCH_ROOTS:
        if not root.exists():
            continue
        # Look for version dirs first
        for version_dir in root.iterdir():
            if not version_dir.is_dir():
                continue
            # Inside version dir, account folders are 32-char hex
            for account_dir in version_dir.iterdir():
                if not account_dir.is_dir() or not ACCOUNT_HASH_RE.match(account_dir.name):
                    continue
                found.append(_inspect_account(account_dir, version_dir.name))
        # Also check direct hex children (older versions)
        for account_dir in root.iterdir():
            if account_dir.is_dir() and ACCOUNT_HASH_RE.match(account_dir.name):
                found.append(_inspect_account(account_dir, version_dir="(legacy)"))
    return found


def _inspect_account(account_dir: Path, version_dir: str) -> WeChatAccount:
    msg_dir = account_dir / "Message"
    msg_dbs = sorted(str(p) for p in msg_dir.glob("msg_*.db")) if msg_dir.exists() else []
    contact_db = msg_dir / "WCDB_Contact.sqlite"
    media = {}
    for name in ("Image", "Video", "Voice", "OpenData", "Audio", "Sticker", "File"):
        d = account_dir / "Message" / name
        if d.exists():
            media[name] = str(d)
    return WeChatAccount(
        root=str(account_dir),
        version_dir=version_dir,
        msg_dbs=msg_dbs,
        contact_db=str(contact_db) if contact_db.exists() else None,
        media_dirs=media,
    )


def main() -> int:
    accounts = discover_accounts()
    if not accounts:
        print("[!] No WeChat data directory found.", file=sys.stderr)
        print("    Make sure WeChat for Mac is installed and you've logged in at least once.", file=sys.stderr)
        return 1

    print(f"[+] Found {len(accounts)} WeChat account folder(s):\n")
    for i, acc in enumerate(accounts):
        print(f"  [{i}] {acc.root}")
        print(f"       version dir : {acc.version_dir}")
        print(f"       msg dbs     : {len(acc.msg_dbs)} files")
        print(f"       contact db  : {'yes' if acc.contact_db else 'no'}")
        print(f"       media dirs  : {', '.join(acc.media_dirs.keys()) or 'none'}")
        print()

    # Emit JSON for downstream scripts
    out_path = Path(__file__).parent / ".discovered_accounts.json"
    out_path.write_text(json.dumps([asdict(a) for a in accounts], indent=2))
    print(f"[+] Wrote inventory to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
