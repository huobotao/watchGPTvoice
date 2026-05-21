"""Load extracted JSONL and pack it into a prompt-friendly context block."""
from __future__ import annotations

import json
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    items: list[dict] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return items


def load_workspace(workspace: Path) -> dict[str, list[dict]]:
    return {
        "photos": load_jsonl(workspace / "photos.jsonl"),
        "contacts": load_jsonl(workspace / "contacts.jsonl"),
        "events": load_jsonl(workspace / "calendar.jsonl"),
    }


def _slice(items: list[dict], limit: int | None) -> list[dict]:
    return items[:limit] if limit else items


def format_compact(
    corpus: dict[str, list[dict]],
    limit_per_kind: int | None = None,
) -> str:
    """One-line-per-record text, kind-grouped. Cheap to stuff into a prompt."""
    parts: list[str] = []

    contacts = corpus.get("contacts", [])
    if contacts:
        parts.append(f"## Contacts (total {len(contacts)})")
        for c in _slice(contacts, limit_per_kind):
            name = (c.get("first_name", "") + " " + c.get("last_name", "")).strip() or "(no name)"
            org = c.get("organization") or ""
            emails = ",".join(c.get("emails") or [])
            phones = ",".join(c.get("phones") or [])
            extras = []
            if org:
                extras.append(f"org={org}")
            if emails:
                extras.append(f"emails={emails}")
            if phones:
                extras.append(f"phones={phones}")
            suffix = (" | " + " ".join(extras)) if extras else ""
            parts.append(f"- {name}{suffix}")

    events = corpus.get("events", [])
    if events:
        parts.append(f"\n## Calendar events (total {len(events)})")
        for e in _slice(events, limit_per_kind):
            parts.append(
                f"- {e.get('start','?')} | {e.get('summary','')}"
                f" @ {e.get('location','')} [{e.get('calendar','')}]"
            )

    photos = corpus.get("photos", [])
    if photos:
        parts.append(f"\n## Photos (total {len(photos)})")
        for p in _slice(photos, limit_per_kind):
            persons = ",".join(p.get("persons") or [])
            keywords = ",".join(p.get("keywords") or [])
            place = p.get("place_name") or ""
            lat, lon = p.get("latitude"), p.get("longitude")
            gps = f"({lat:.4f},{lon:.4f})" if lat is not None and lon is not None else ""
            parts.append(
                f"- {p.get('date','?')} | persons=[{persons}] | place={place}{gps}"
                f" | kw=[{keywords}] | {p.get('media_type','photo')}"
            )

    return "\n".join(parts) if parts else "(empty corpus — run `icloud-ai extract` first)"
