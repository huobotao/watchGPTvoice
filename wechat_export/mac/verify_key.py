#!/usr/bin/env python3
"""
Sanity-check the key in .wechat_key by trying to decrypt the smallest msg_*.db
and read its sqlite_master. Exits 0 if key works, 1 otherwise.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from decrypt import load_key, decrypt_db
from find_dbs import discover_accounts


def main() -> int:
    accounts = discover_accounts()
    if not accounts:
        print("[!] No WeChat data found.", file=sys.stderr)
        return 1
    acc = max(accounts, key=lambda a: len(a.msg_dbs))
    if not acc.msg_dbs:
        print("[!] Selected account has no message DBs.", file=sys.stderr)
        return 1

    # Pick smallest
    smallest = min(acc.msg_dbs, key=lambda p: Path(p).stat().st_size)
    key = load_key()
    with tempfile.NamedTemporaryFile(suffix=".plain.db", delete=False) as tmp:
        out = Path(tmp.name)
    try:
        decrypt_db(Path(smallest), out, key)
        import sqlite3
        conn = sqlite3.connect(out)
        n_tables = conn.execute("SELECT count(*) FROM sqlite_master").fetchone()[0]
        conn.close()
        print(f"[+] Key works. {Path(smallest).name} decrypted, {n_tables} tables found.")
        return 0
    except SystemExit as e:
        print(f"[!] Key verification failed: {e}", file=sys.stderr)
        return 1
    finally:
        out.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
