import os
import json
import argparse
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq


def normalize(data: dict, audio_path: str) -> dict:
    segments_in = data.get("segments", []) or []
    words_flat = data.get("words", []) or []

    out_segments: list[dict] = []
    has_seg_words = bool(segments_in and segments_in[0].get("words"))

    for i, seg in enumerate(segments_in):
        if has_seg_words:
            raw_words = seg.get("words", [])
        else:
            raw_words = [w for w in words_flat
                         if float(w["start"]) >= float(seg["start"]) - 0.01
                         and float(w["end"]) <= float(seg["end"]) + 0.01]
        words = []
        for w in raw_words:
            if isinstance(w, str) or "start" not in w or "end" not in w:
                continue
            text = (w.get("word") or w.get("text") or "").strip()
            if not text:
                continue
            words.append({
                "w": text,
                "start": float(w["start"]),
                "end": float(w["end"]),
                "conf": 1.0,
                "speaker": "0",
            })
        if not words:
            continue
        out_segments.append({
            "id": i,
            "speaker": "0",
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": (seg.get("text") or "").strip() or " ".join(x["w"] for x in words),
            "words": words,
        })

    return {
        "engine": "groq",
        "audio": str(audio_path),
        "duration_s": float(data.get("duration") or 0.0),
        "language": data.get("language") or "en",
        "segments": out_segments,
    }


def transcribe(audio_path: str, api_key: str, model: str = "whisper-large-v3",
               language: str | None = None) -> dict:
    client = Groq(api_key=api_key)
    with open(audio_path, "rb") as f:
        kwargs = {
            "file": (Path(audio_path).name, f.read()),
            "model": model,
            "response_format": "verbose_json",
            "timestamp_granularities": ["word", "segment"],
        }
        if language:
            kwargs["language"] = language
        r = client.audio.transcriptions.create(**kwargs)
    return r.to_dict() if hasattr(r, "to_dict") else r.model_dump()


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", default="outputs/groq.json")
    ap.add_argument("--model", default="whisper-large-v3")
    ap.add_argument("--language")
    args = ap.parse_args()

    data = transcribe(args.audio, os.environ["GROQ_API_KEY"],
                      model=args.model, language=args.language)
    out = normalize(data, args.audio)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: {len(out['segments'])} segments")


if __name__ == "__main__":
    main()
