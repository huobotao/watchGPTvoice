import os
import json
import argparse
from pathlib import Path

from dotenv import load_dotenv
from deepgram import DeepgramClient, PrerecordedOptions, FileSource


def normalize(raw: dict, audio_path: str) -> dict:
    ch = raw["results"]["channels"][0]["alternatives"][0]
    words = ch.get("words", [])
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
        spk = str(w.get("speaker", 0))
        gap = (w["start"] - cur_words[-1]["end"]) if cur_words else 0.0
        if cur_speaker is not None and (spk != cur_speaker or gap > 1.5):
            flush()
            cur_words = []
        cur_speaker = spk
        cur_words.append({
            "w": w.get("punctuated_word") or w["word"],
            "start": float(w["start"]),
            "end": float(w["end"]),
            "conf": float(w.get("confidence", 1.0)),
            "speaker": spk,
        })
    flush()
    for i, s in enumerate(segments):
        s["id"] = i

    return {
        "engine": "deepgram",
        "audio": str(audio_path),
        "duration_s": raw["metadata"].get("duration", 0.0),
        "language": raw["metadata"].get("language", "multi"),
        "segments": segments,
    }


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", default="outputs/deepgram.json")
    ap.add_argument("--model", default="nova-3")
    ap.add_argument("--language", default="multi")
    args = ap.parse_args()

    client = DeepgramClient(os.environ["DEEPGRAM_API_KEY"])
    with open(args.audio, "rb") as f:
        buf = f.read()
    options = PrerecordedOptions(
        model=args.model,
        language=args.language,
        smart_format=True,
        diarize=True,
        punctuate=True,
        utterances=True,
        paragraphs=True,
    )
    payload: FileSource = {"buffer": buf}
    resp = client.listen.rest.v("1").transcribe_file(payload, options)
    raw = resp.to_dict()

    out = normalize(raw, args.audio)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: {len(out['segments'])} segments, "
          f"{sum(len(s['words']) for s in out['segments'])} words")


if __name__ == "__main__":
    main()
