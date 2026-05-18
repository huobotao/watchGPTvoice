import os
import json
import time
import argparse
from pathlib import Path

import requests
from dotenv import load_dotenv

API = "https://api.assemblyai.com/v2"


def normalize(data: dict, audio_path: str) -> dict:
    words = data.get("words", []) or []
    segments: list[dict] = []
    cur_speaker: str | None = None
    cur_words: list[dict] = []

    def flush():
        if cur_words:
            segments.append({
                "speaker": cur_speaker,
                "start": cur_words[0]["start"],
                "end": cur_words[-1]["end"],
                "text": " ".join(x["w"] for x in cur_words),
                "words": cur_words.copy(),
            })

    for w in words:
        spk = str(w.get("speaker") or "0")
        start = float(w["start"]) / 1000.0
        end = float(w["end"]) / 1000.0
        gap = (start - cur_words[-1]["end"]) if cur_words else 0.0
        if cur_speaker is not None and (spk != cur_speaker or gap > 1.5):
            flush()
            cur_words = []
        cur_speaker = spk
        cur_words.append({
            "w": w["text"],
            "start": start,
            "end": end,
            "conf": float(w.get("confidence", 1.0)),
            "speaker": spk,
        })
    flush()
    for i, s in enumerate(segments):
        s["id"] = i

    return {
        "engine": "assemblyai",
        "audio": str(audio_path),
        "duration_s": float(data.get("audio_duration") or 0.0),
        "language": data.get("language_code") or "en",
        "segments": segments,
    }


def transcribe(audio_path: str, api_key: str, multichannel: bool = False) -> dict:
    headers = {"authorization": api_key}
    with open(audio_path, "rb") as f:
        r = requests.post(f"{API}/upload", headers=headers, data=f, timeout=120)
    r.raise_for_status()
    audio_url = r.json()["upload_url"]

    payload = {
        "audio_url": audio_url,
        "speaker_labels": True,
        "language_detection": True,
        "punctuate": True,
        "format_text": True,
        "speech_model": "universal",
    }
    if multichannel:
        payload["multichannel"] = True

    r = requests.post(f"{API}/transcript", headers=headers, json=payload, timeout=30)
    r.raise_for_status()
    tid = r.json()["id"]

    while True:
        r = requests.get(f"{API}/transcript/{tid}", headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json()
        if data["status"] == "completed":
            return data
        if data["status"] == "error":
            raise RuntimeError(data.get("error", "AssemblyAI error"))
        time.sleep(3)


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", default="outputs/assemblyai.json")
    args = ap.parse_args()

    data = transcribe(args.audio, os.environ["ASSEMBLYAI_API_KEY"])
    out = normalize(data, args.audio)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: {len(out['segments'])} segments")


if __name__ == "__main__":
    main()
