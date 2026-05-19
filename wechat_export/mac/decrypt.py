#!/usr/bin/env python3
"""
Decrypt a WeChat for Mac SQLCipher database to a plain SQLite file.

WeChat uses SQLCipher with these (non-default) parameters:
  - cipher: AES-256-CBC
  - page size: 4096
  - kdf_iter: 64000  (NB: WeChat-specific; default SQLCipher 4 is 256000)
  - HMAC: SHA1
  - KDF: PBKDF2_HMAC_SHA1

The standard "decrypt" trick: ATTACH plaintext DB and sqlcipher_export().

Requires `sqlcipher` CLI installed (`brew install sqlcipher`).
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

KEY_FILE = Path(__file__).parent / ".wechat_key"


def load_key(explicit: str | None = None) -> str:
    if explicit:
        k = explicit.strip().lower()
    else:
        if not KEY_FILE.exists():
            raise SystemExit(
                f"[!] No key found at {KEY_FILE}. Run extract_key.py first, "
                f"or pass --key on the command line."
            )
        k = KEY_FILE.read_text().strip().lower()
    if len(k) != 64 or any(c not in "0123456789abcdef" for c in k):
        raise SystemExit("[!] Key must be a 64-char hex string (32 bytes)")
    return k


def decrypt_db(encrypted: Path, plaintext_out: Path, key_hex: str) -> None:
    """Use sqlcipher CLI to ATTACH a new plain DB and export everything to it."""
    if plaintext_out.exists():
        plaintext_out.unlink()
    plaintext_out.parent.mkdir(parents=True, exist_ok=True)

    # The sequence of PRAGMAs MUST match WeChat's SQLCipher config.
    sql = f"""
PRAGMA key = "x'{key_hex}'";
PRAGMA cipher_page_size = 4096;
PRAGMA kdf_iter = 64000;
PRAGMA cipher_hmac_algorithm = HMAC_SHA1;
PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA1;
PRAGMA cipher_use_hmac = ON;

-- Verify by reading one table; will raise if key is wrong.
SELECT count(*) FROM sqlite_master;

ATTACH DATABASE '{plaintext_out}' AS plaintext KEY '';
SELECT sqlcipher_export('plaintext');
DETACH DATABASE plaintext;
"""
    proc = subprocess.run(
        ["sqlcipher", str(encrypted)],
        input=sql,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 or "file is not a database" in proc.stderr or "error" in proc.stderr.lower():
        raise SystemExit(
            f"[!] Failed to decrypt {encrypted.name}:\n"
            f"    stdout: {proc.stdout.strip()}\n"
            f"    stderr: {proc.stderr.strip()}\n"
            f"    Key may be wrong, or WeChat's SQLCipher params changed (see README §KEY_FORMAT_V4)."
        )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("encrypted", help="Path to msg_X.db or WCDB_Contact.sqlite")
    ap.add_argument("--out", help="Output plaintext DB path (default: <name>.plain.db)")
    ap.add_argument("--key", help="Hex key (else loaded from .wechat_key)")
    args = ap.parse_args()

    enc = Path(args.encrypted)
    if not enc.exists():
        print(f"[!] {enc} does not exist", file=sys.stderr)
        return 1
    out = Path(args.out) if args.out else enc.with_suffix(".plain.db")

    key = load_key(args.key)
    print(f"[*] Decrypting {enc.name} -> {out}")
    decrypt_db(enc, out, key)
    print(f"[+] OK ({out.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
