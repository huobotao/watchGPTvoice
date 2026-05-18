import os
import json
import asyncio
import argparse
from pathlib import Path

from dotenv import load_dotenv


SYSTEM_PROMPT = (
    "You are a court interpreter assistant. "
    "Translate the given English court transcript into Simplified Chinese, preserving: "
    "(1) legal precision and register; "
    "(2) names of parties, dates, and monetary amounts exactly; "
    "(3) hedging and uncertainty (e.g. 'I believe', 'approximately'); "
    "(4) tone (judge's formality, lawyer's argumentation). "
    "Output ONLY the Chinese translation — no preamble, no notes."
)


async def claude(text: str) -> str:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic()
    model = os.environ.get("CLAUDE_MODEL", "claude-opus-4-7")
    r = await client.messages.create(
        model=model,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text}],
    )
    return r.content[0].text


async def openai_gpt(text: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI()
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")
    r = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    )
    return r.choices[0].message.content or ""


async def gemini(text: str) -> str:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-pro")
    r = await client.aio.models.generate_content(
        model=model,
        contents=SYSTEM_PROMPT + "\n\n" + text,
    )
    return r.text or ""


ENGINES = {"claude": claude, "gpt": openai_gpt, "gemini": gemini}


async def translate_all(text: str, engines: list[str] | None = None) -> dict[str, str]:
    engines = engines or list(ENGINES.keys())
    coros = [ENGINES[e](text) for e in engines]
    results = await asyncio.gather(*coros, return_exceptions=True)
    return {
        e: (r if isinstance(r, str) else f"[ERROR: {type(r).__name__}: {r}]")
        for e, r in zip(engines, results)
    }


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--transcript")
    ap.add_argument("--from-seg", type=int)
    ap.add_argument("--to-seg", type=int)
    args = ap.parse_args()

    if args.text:
        text = args.text
    else:
        data = json.loads(Path(args.transcript).read_text())
        a = args.from_seg or 0
        b = (args.to_seg if args.to_seg is not None else a) + 1
        text = "\n\n".join(s["text"] for s in data["segments"][a:b])

    results = asyncio.run(translate_all(text))
    for k, v in results.items():
        print(f"\n=== {k} ===\n{v}")


if __name__ == "__main__":
    main()
