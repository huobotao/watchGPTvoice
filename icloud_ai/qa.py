"""Free-form ask + canned analyses ('one-click' presets)."""
from __future__ import annotations

from pathlib import Path

from .corpus import format_compact, load_workspace
from .providers import LLMProvider

SYSTEM_BASE = """You are an analyst working over a personal data corpus extracted
from a user's macOS Photos library, Contacts, and Calendar (synced via iCloud).
Each record is one JSON-ish line under a kind header (Contacts / Calendar events / Photos).

Rules:
- Cite specific dates, names, and places from the corpus. Don't invent records.
- If the data is insufficient to answer, say what's missing.
- Answer in the same language the user used.
- When listing people / places / events, prefer chronological order unless asked otherwise.
"""

ANALYSES: dict[str, str] = {
    "relationships": (
        "Map the user's significant relationships. Group people by closeness, "
        "judged by how often they co-appear in photos and calendar events. "
        "For each person give: total appearances, time span of contact (first/last), "
        "typical contexts (work / family / travel / etc.). Mark uncertainty."
    ),
    "timeline": (
        "Build a chronological timeline of the user's life events, year by year "
        "(months under each year). Use photo dates, event dates, and location "
        "changes as evidence. Highlight clusters that look like major life events "
        "(moves, trips, weddings, jobs)."
    ),
    "social": (
        "Build a social network from co-occurrence in photos and events. "
        "Output: (1) an adjacency list — for each person, who they appear with "
        "and how often, (2) cluster labels (family / colleagues / friends / etc.) "
        "with the evidence you used. Be explicit about the threshold for 'cluster'."
    ),
    "trajectory": (
        "Reconstruct the user's location trajectory using photo GPS, place names, "
        "and event locations. Group into trips / stays. Per trip: dates, places "
        "visited in order, companions (from photo persons or event attendees)."
    ),
    "history": (
        "Summarize what the user has been doing across the years covered. "
        "Themes, recurring activities, milestones. Be specific: cite dates and the "
        "evidence (e.g. 'photos at X on date Y', 'calendar event Z')."
    ),
}


def _build_system(workspace: Path, limit: int | None) -> str:
    corpus = load_workspace(workspace)
    context = format_compact(corpus, limit_per_kind=limit)
    return SYSTEM_BASE + "\n\n# Corpus\n" + context


def ask(
    provider: LLMProvider,
    workspace: Path,
    question: str,
    limit: int | None = None,
) -> str:
    return provider.chat(_build_system(workspace, limit), question)


def analyze(
    provider: LLMProvider,
    workspace: Path,
    kind: str,
    limit: int | None = None,
) -> str:
    if kind not in ANALYSES:
        raise ValueError(
            f"unknown analysis: {kind!r}. choose from {list(ANALYSES)}"
        )
    return provider.chat(_build_system(workspace, limit), ANALYSES[kind])
