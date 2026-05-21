"""Pull data out of macOS Photos / Contacts / Calendar into JSONL.

All three extractors only work on macOS:
- Photos uses the `osxphotos` library, which reads the Photos library SQLite db.
- Contacts and Calendar shell out to `osascript` (AppleScript bridge).

The user must grant Full Disk Access (for Photos) and Contacts/Calendar access
(prompted on first run) to the terminal / Python binary in
System Settings -> Privacy & Security.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


def extract_photos(out_path: Path, limit: int | None = None) -> int:
    try:
        import osxphotos
    except ImportError as e:
        raise RuntimeError(
            "osxphotos not installed. Run: pip install osxphotos"
        ) from e

    photosdb = osxphotos.PhotosDB()
    photos = photosdb.photos()
    if limit:
        photos = photos[:limit]

    count = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for p in photos:
            place = getattr(p, "place", None)
            row = {
                "kind": "photo",
                "uuid": p.uuid,
                "date": p.date.isoformat() if p.date else None,
                "title": p.title,
                "description": p.description,
                "favorite": p.favorite,
                "persons": list(p.persons or []),
                "keywords": list(p.keywords or []),
                "albums": list(p.albums or []),
                "place_name": place.name if place else None,
                "place_country": place.country_code if place else None,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "media_type": "video" if p.ismovie else "photo",
                "width": p.width,
                "height": p.height,
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


_CONTACTS_APPLESCRIPT = r'''
tell application "Contacts"
    set output to ""
    repeat with p in people
        set fn to ""
        try
            set fn to first name of p as text
        end try
        set ln to ""
        try
            set ln to last name of p as text
        end try
        set org to ""
        try
            set org to organization of p as text
        end try
        set noteText to ""
        try
            set noteText to (note of p) as text
        end try
        set emailList to ""
        try
            repeat with e in emails of p
                set emailList to emailList & (value of e as text) & "|"
            end repeat
        end try
        set phoneList to ""
        try
            repeat with ph in phones of p
                set phoneList to phoneList & (value of ph as text) & "|"
            end repeat
        end try
        set output to output & fn & tab & ln & tab & org & tab & emailList & tab & phoneList & tab & noteText & linefeed
    end repeat
    return output
end tell
'''


def extract_contacts(out_path: Path) -> int:
    try:
        result = subprocess.run(
            ["osascript", "-e", _CONTACTS_APPLESCRIPT],
            check=True, capture_output=True, text=True, timeout=300,
        )
    except FileNotFoundError as e:
        raise RuntimeError("osascript not found; this must run on macOS") from e

    count = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for line in result.stdout.splitlines():
            parts = line.split("\t")
            if len(parts) < 6:
                continue
            fn, ln, org, emails, phones, note = parts[:6]
            row = {
                "kind": "contact",
                "first_name": fn,
                "last_name": ln,
                "organization": org,
                "emails": [e for e in emails.split("|") if e],
                "phones": [p for p in phones.split("|") if p],
                "note": note,
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def _calendar_applescript(days_back: int, days_fwd: int) -> str:
    return f'''
    set startDate to (current date) - ({days_back} * days)
    set endDate to (current date) + ({days_fwd} * days)
    tell application "Calendar"
        set output to ""
        repeat with c in calendars
            try
                set calName to name of c
                set evList to (every event of c whose start date is greater than startDate and start date is less than endDate)
                repeat with e in evList
                    set sName to ""
                    try
                        set sName to summary of e as text
                    end try
                    set loc to ""
                    try
                        set loc to location of e as text
                    end try
                    set sd to (start date of e) as string
                    set ed to (end date of e) as string
                    set output to output & sName & tab & loc & tab & sd & tab & ed & tab & calName & linefeed
                end repeat
            end try
        end repeat
        return output
    end tell
    '''


def extract_calendar(out_path: Path, days_back: int = 365 * 5, days_fwd: int = 365) -> int:
    try:
        result = subprocess.run(
            ["osascript", "-e", _calendar_applescript(days_back, days_fwd)],
            check=True, capture_output=True, text=True, timeout=600,
        )
    except FileNotFoundError as e:
        raise RuntimeError("osascript not found; this must run on macOS") from e

    count = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for line in result.stdout.splitlines():
            parts = line.split("\t")
            if len(parts) < 5:
                continue
            summary, location, start, end, cal = parts[:5]
            row = {
                "kind": "event",
                "summary": summary,
                "location": location,
                "start": start,
                "end": end,
                "calendar": cal,
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count
