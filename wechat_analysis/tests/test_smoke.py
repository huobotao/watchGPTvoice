"""End-to-end smoke test: synth → ingest → profile.

Run: python -m wechat_analysis.tests.test_smoke
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from wechat_analysis.etl import ingest_path
from wechat_analysis.profile import build_profiles, write_outputs
from wechat_analysis.sample.generate import generate


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="wxa_"))
    try:
        synth = tmp / "synth.jsonl"
        n = generate(synth, datetime(2025, 11, 1, tzinfo=timezone(timedelta(hours=8))), days=180)
        assert n > 0, "no synthetic messages generated"

        db = tmp / "events.db"
        ins, skip = ingest_path(synth, db)
        assert ins == n, f"expected {n} inserts, got {ins}"

        # idempotent re-ingest
        ins2, skip2 = ingest_path(synth, db)
        assert ins2 == 0 and skip2 == n, f"reingest not idempotent: {ins2}/{skip2}"

        profiles = build_profiles(db)
        assert len(profiles) >= 4, f"expected >=4 peers, got {len(profiles)}"

        # spot-check: lover should show 'falling' trend
        lover = next((p for p in profiles if p.peer_id == "wxid_lover"), None)
        assert lover is not None, "lover peer missing"
        assert lover.trend in ("falling", "dormant"), f"lover trend={lover.trend}"
        assert lover.transfer_count == 3, f"lover transfers={lover.transfer_count}"

        # spot-check: boss should be weekday-heavy (weekend_ratio low)
        boss = next((p for p in profiles if p.peer_id == "wxid_boss"), None)
        assert boss is not None
        assert boss.weekend_ratio < 0.2, f"boss weekend_ratio={boss.weekend_ratio}"

        # render outputs
        out = tmp / "out"
        write_outputs(profiles, out)
        assert (out / "overview.md").exists()
        assert (out / "profiles.json").exists()
        cards = list((out / "cards").glob("*.md"))
        assert len(cards) == len(profiles)

        print(f"OK  messages={n}  peers={len(profiles)}  cards={len(cards)}")
        # show a small slice of overview
        print("\n--- overview.md (head) ---")
        print("\n".join((out / "overview.md").read_text(encoding="utf-8").splitlines()[:10]))
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
