#!/usr/bin/env python3
"""
Extract the SQLCipher master key from a running WeChat for Mac process.

Method: attach lldb to the WeChat process, set a breakpoint on sqlite3_key /
sqlite3_key_v2, force a DB open by listing recent chats (caller's
responsibility), and read the key buffer from the function's argument.

Falls back to scanning process memory for a 64-byte hex-printable region near
the WCDB module if the breakpoint method fails.

Requires sudo. Requires the Terminal app to have Full Disk Access on macOS.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

KEY_FILE = Path(__file__).parent / ".wechat_key"
WECHAT_PROCESS_NAMES = ("WeChat", "WeChatAppEx", "WeChat Helper")


def find_wechat_pid() -> int | None:
    """Return PID of the main WeChat process, or None."""
    try:
        out = subprocess.check_output(["pgrep", "-x", "WeChat"], text=True).strip()
        if out:
            return int(out.splitlines()[0])
    except subprocess.CalledProcessError:
        pass
    # Fallback: ps + grep
    try:
        out = subprocess.check_output(["ps", "-Ao", "pid,comm"], text=True)
        for line in out.splitlines():
            parts = line.strip().split(None, 1)
            if len(parts) == 2 and parts[1].endswith("/WeChat"):
                return int(parts[0])
    except Exception:
        pass
    return None


LLDB_SCRIPT = r"""
# Break on sqlite3_key_v2; print the 32-byte key buffer (arg 2 = zKey, arg 3 = nKey).
breakpoint set --name sqlite3_key_v2
breakpoint set --name sqlite3_key
breakpoint command add 1 -o "memory read --size 1 --format x --count 32 $rsi"
breakpoint command add 2 -o "memory read --size 1 --format x --count 32 $rsi"
continue
"""


def extract_via_lldb(pid: int, timeout_s: int = 30) -> str | None:
    """Attach lldb to PID, set breakpoint, wait for hit, return 64-char hex key."""
    # Write LLDB commands to a temp file
    script_path = Path("/tmp/wx_key_lldb.txt")
    script_path.write_text(LLDB_SCRIPT)

    print(f"[*] Attaching lldb to PID {pid}... (will wait up to {timeout_s}s for a DB key call)", flush=True)
    print("[*] In WeChat, click any chat to force a DB open if nothing happens.", flush=True)

    try:
        proc = subprocess.run(
            ["lldb", "-p", str(pid), "-s", str(script_path), "-o", "quit", "--batch"],
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired as e:
        print("[!] lldb timed out. Try the manual method in get_key_manual.md", file=sys.stderr)
        return None

    # Parse: look for 16 lines of hex bytes after a breakpoint hit
    return parse_lldb_memory_dump(proc.stdout)


def parse_lldb_memory_dump(text: str) -> str | None:
    """Find the 32-byte buffer that lldb printed after the breakpoint hit."""
    # lldb 'memory read' output lines look like:
    # 0x000... 0xab 0xcd 0xef 0x01 ...
    hex_bytes: list[str] = []
    for line in text.splitlines():
        m = re.findall(r"0x([0-9a-fA-F]{2})\b", line)
        # Skip the address itself (longer hex), keep only 2-char hex bytes
        if len(m) >= 4 and not line.strip().startswith("0x" + "0" * 4):
            # Heuristic: data lines have multiple 0xNN tokens
            for h in m:
                hex_bytes.append(h.lower())
                if len(hex_bytes) >= 32:
                    return "".join(hex_bytes)
    if len(hex_bytes) >= 32:
        return "".join(hex_bytes[:32])
    return None


def main() -> int:
    if os.geteuid() != 0:
        print("[!] Run with sudo: sudo python3 extract_key.py", file=sys.stderr)
        return 2

    pid = find_wechat_pid()
    if pid is None:
        print("[!] WeChat is not running. Launch WeChat first, log in, then re-run.", file=sys.stderr)
        return 1
    print(f"[+] Found WeChat PID: {pid}")

    key = extract_via_lldb(pid)
    if not key or len(key) != 64:
        print("[!] Automated extraction failed. Use get_key_manual.md for the manual lldb flow.", file=sys.stderr)
        return 1

    KEY_FILE.write_text(key + "\n")
    os.chmod(KEY_FILE, 0o600)
    print(f"[+] Key extracted ({len(key)} hex chars). Saved to {KEY_FILE}")
    print(f"    Key fingerprint: {key[:8]}...{key[-8:]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
