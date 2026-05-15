"""Generate the two default alert beep WAVs into assets/.

Run once after cloning:
    python scripts/make_beeps.py

These are intentionally short, distinct, and royalty-free since we synthesize
them from sine waves with Python stdlib only.
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050


def _write_sine(path: Path, freqs_hz: list[float], total_seconds: float, gain: float = 0.35) -> None:
    n = int(total_seconds * SAMPLE_RATE)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        # Envelope to avoid clicks at start/end.
        attack = int(0.01 * SAMPLE_RATE)
        release = int(0.02 * SAMPLE_RATE)
        for i in range(n):
            t = i / SAMPLE_RATE
            sample = 0.0
            for f in freqs_hz:
                sample += math.sin(2 * math.pi * f * t)
            sample /= len(freqs_hz)
            env = 1.0
            if i < attack:
                env = i / attack
            elif i > n - release:
                env = max(0.0, (n - i) / release)
            value = int(sample * env * gain * 32767)
            frames.extend(struct.pack("<h", value))
        wf.writeframes(bytes(frames))


def main() -> None:
    here = Path(__file__).resolve().parent.parent / "assets"
    # Soft single tone — informational beep.
    _write_sine(here / "beep.wav", freqs_hz=[880.0], total_seconds=0.18)
    # Higher / two-tone alarm — high-priority alert.
    out = here / "beep_high.wav"
    n = int(0.45 * SAMPLE_RATE)
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        attack = int(0.005 * SAMPLE_RATE)
        release = int(0.02 * SAMPLE_RATE)
        for i in range(n):
            t = i / SAMPLE_RATE
            # Alternate two frequencies every 100ms.
            tone = 1175.0 if (int(t * 10) % 2 == 0) else 1568.0
            sample = math.sin(2 * math.pi * tone * t)
            env = 1.0
            if i < attack:
                env = i / attack
            elif i > n - release:
                env = max(0.0, (n - i) / release)
            value = int(sample * env * 0.45 * 32767)
            frames.extend(struct.pack("<h", value))
        wf.writeframes(bytes(frames))
    print(f"Wrote: {here/'beep.wav'} and {here/'beep_high.wav'}")


if __name__ == "__main__":
    main()
