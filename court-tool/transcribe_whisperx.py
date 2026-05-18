import os
import json
import argparse
from pathlib import Path

from dotenv import load_dotenv


def normalize(result: dict, audio_path: str, language: str) -> dict:
    segments: list[dict] = []
    for i, seg in enumerate(result.get("segments", [])):
        words = []
        for w in seg.get("words", []):
            if "start" not in w or "end" not in w:
                continue
            words.append({
                "w": w.get("word", "").strip(),
                "start": float(w["start"]),
                "end": float(w["end"]),
                "conf": float(w.get("score", 0.0)),
                "speaker": str(w.get("speaker", seg.get("speaker", "0"))),
            })
        if not words:
            continue
        segments.append({
            "id": i,
            "speaker": str(seg.get("speaker", words[0]["speaker"])),
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": seg.get("text", " ".join(x["w"] for x in words)).strip(),
            "words": words,
        })
    return {
        "engine": "whisperx",
        "audio": str(audio_path),
        "duration_s": segments[-1]["end"] if segments else 0.0,
        "language": language,
        "segments": segments,
    }


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", default="outputs/whisperx.json")
    ap.add_argument("--model", default=os.environ.get("WX_MODEL", "large-v3"))
    ap.add_argument("--device", default=os.environ.get("WX_DEVICE", "cpu"))
    ap.add_argument("--compute-type", default=os.environ.get("WX_COMPUTE", "int8"))
    ap.add_argument("--diarize", action="store_true",
                    help="Run pyannote diarization (needs HF_TOKEN with model access)")
    args = ap.parse_args()

    import whisperx
    audio = whisperx.load_audio(args.audio)
    asr = whisperx.load_model(args.model, args.device, compute_type=args.compute_type)
    result = asr.transcribe(audio, batch_size=8)
    lang = result["language"]

    align_model, meta = whisperx.load_align_model(language_code=lang, device=args.device)
    aligned = whisperx.align(
        result["segments"], align_model, meta, audio, args.device,
        return_char_alignments=False,
    )

    if args.diarize:
        diar = whisperx.DiarizationPipeline(
            use_auth_token=os.environ["HF_TOKEN"], device=args.device,
        )
        diar_segments = diar(audio)
        aligned = whisperx.assign_word_speakers(diar_segments, aligned)

    out = normalize(aligned, args.audio, lang)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {args.out}: {len(out['segments'])} segments")


if __name__ == "__main__":
    main()
