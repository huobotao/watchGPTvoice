import json
import argparse
import string
from pathlib import Path


_STRIP = string.punctuation + "。，！？：；、""''「」《》〈〉"


def _norm(s: str) -> str:
    return s.strip().lower().strip(_STRIP)


def _overlap(a: dict, b: dict) -> float:
    return max(0.0, min(a["end"], b["end"]) - max(a["start"], b["start"]))


def merge(primary: dict, others: list[dict], conf_threshold: float = 0.7) -> dict:
    flat_others = []
    for o in others:
        flat = []
        for s in o["segments"]:
            for w in s["words"]:
                flat.append({**w, "engine": o["engine"]})
        flat.sort(key=lambda x: x["start"])
        flat_others.append((o["engine"], flat))

    review = 0
    total = 0
    for seg in primary["segments"]:
        for w in seg["words"]:
            total += 1
            alts = []
            wlen = max(w["end"] - w["start"], 0.001)
            for engine, flat in flat_others:
                for c in flat:
                    if c["start"] > w["end"] + 0.5:
                        break
                    if c["end"] < w["start"] - 0.5:
                        continue
                    ov = _overlap(c, w)
                    clen = max(c["end"] - c["start"], 0.001)
                    if ov <= 0.05 or ov < 0.3 * min(wlen, clen):
                        continue
                    if _norm(c["w"]) != _norm(w["w"]):
                        alts.append({"engine": engine, "w": c["w"], "conf": c["conf"]})
            w["alternatives"] = alts
            w["needs_review"] = bool(alts) or w["conf"] < conf_threshold
            if w["needs_review"]:
                review += 1

    return {
        "primary_engine": primary["engine"],
        "compared_engines": [o["engine"] for o in others],
        "audio": primary["audio"],
        "duration_s": primary["duration_s"],
        "language": primary["language"],
        "segments": primary["segments"],
        "stats": {"total_words": total, "review_words": review},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--primary", required=True)
    ap.add_argument("--other", action="append", default=[])
    ap.add_argument("-o", "--out", default="outputs/merged.json")
    ap.add_argument("--conf-threshold", type=float, default=0.7)
    args = ap.parse_args()

    primary = json.loads(Path(args.primary).read_text())
    others = [json.loads(Path(p).read_text()) for p in args.other]

    merged = merge(primary, others, args.conf_threshold)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(merged, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: "
          f"{merged['stats']['review_words']}/{merged['stats']['total_words']} words flagged")


if __name__ == "__main__":
    main()
