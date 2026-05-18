import os
import json
import time
import base64
import mimetypes
import argparse
from pathlib import Path

import requests
from dotenv import load_dotenv

MODEL = "victor-upmeet/whisperx"


def normalize(output: dict, audio_path: str, lang_fallback: str) -> dict:
    segments: list[dict] = []
    for i, seg in enumerate(output.get("segments", [])):
        words = []
        for w in seg.get("words", []):
            if "start" not in w or "end" not in w:
                continue
            words.append({
                "w": (w.get("word") or "").strip(),
                "start": float(w["start"]),
                "end": float(w["end"]),
                "conf": float(w.get("score") or 0.0),
                "speaker": str(w.get("speaker", "0")),
            })
        if not words:
            continue
        segments.append({
            "id": i,
            "speaker": str(seg.get("speaker", words[0]["speaker"])),
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": (seg.get("text") or " ".join(x["w"] for x in words)).strip(),
            "words": words,
        })
    return {
        "engine": "replicate_whisperx",
        "audio": str(audio_path),
        "duration_s": segments[-1]["end"] if segments else 0.0,
        "language": output.get("detected_language") or lang_fallback,
        "segments": segments,
    }


def _data_url(audio_path: str) -> str:
    mime = mimetypes.guess_type(audio_path)[0] or "audio/mpeg"
    with open(audio_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{b64}"


def transcribe(audio_path: str, token: str, language: str = "en",
               audio_url: str | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    audio_input = audio_url or _data_url(audio_path)

    body = {
        "input": {
            "audio_file": audio_input,
            "language": language,
            "diarization": False,
            "align_output": True,
            "batch_size": 8,
        },
    }
    r = requests.post(
        f"https://api.replicate.com/v1/models/{MODEL}/predictions",
        headers=headers, json=body, timeout=120,
    )
    r.raise_for_status()
    pred = r.json()

    while pred["status"] not in ("succeeded", "failed", "canceled"):
        time.sleep(3)
        r = requests.get(pred["urls"]["get"], headers=headers, timeout=30)
        r.raise_for_status()
        pred = r.json()

    if pred["status"] != "succeeded":
        raise RuntimeError(pred.get("error", "Replicate failed"))
    return pred["output"]


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", default="outputs/replicate_whisperx.json")
    ap.add_argument("--language", default="en")
    ap.add_argument("--audio-url", help="Public URL to audio (avoids base64 upload)")
    args = ap.parse_args()

    output = transcribe(args.audio, os.environ["REPLICATE_API_TOKEN"],
                        language=args.language, audio_url=args.audio_url)
    out = normalize(output, args.audio, args.language)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: {len(out['segments'])} segments")


if __name__ == "__main__":
    main()
