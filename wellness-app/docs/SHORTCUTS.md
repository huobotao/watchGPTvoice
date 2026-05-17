# Apple Shortcut: one-tap heart-rate import

This is the PWA-era "one tap" workflow for getting Apple Watch heart-rate
data into a session. (Native HealthKit one-tap will come with the
Capacitor wrapper in V2.)

## What the Shortcut does

1. Read all heart-rate samples from HealthKit for the last *N* minutes
   (you choose).
2. Build a JSON array `[{ "date": "...ISO...", "bpm": 92 }, …]`.
3. Base64-encode it.
4. Open `https://<your-app-domain>/?import=<base64>` in Safari.

When the page opens, the app detects `?import=` in the URL, decodes the
payload, opens (or creates) the most recent session, and pre-fills the
heart-rate import drawer with the parsed samples. Tap **Save to session**
and they are attached.

The URL parameter is stripped immediately, so a refresh will not import
the data twice.

## Build the Shortcut

In the Shortcuts app on iPhone:

1. **+ New Shortcut**, name it `Log HR (last 90 min)`.
2. **Find Health Samples Where**
   - Sample Type: **Heart Rate**
   - Sort by: **End Date**
   - Order: **Latest First**
   - Limit: **300** (a 90-minute window with ~1 sample / 5 s is ~1,080
     samples — adjust the limit to taste; the app silently drops samples
     it cannot parse).
   - Filter: **End Date is in the last 90 Minutes** (or however long your
     sessions tend to run).
3. **Repeat with Each** over the *Health Samples* output:
   - Inside the loop, use **Get Dictionary from Input** (build via
     `Dictionary`) with two keys:
     - `date` → `Repeat Item` → *Start Date* → format as ISO 8601
     - `bpm`  → `Repeat Item` → *Numerical Value*
   - **Add to Variable** named `Samples`.
4. After the loop, **Get Contents of `Samples` as JSON Text**.
5. **Base64 Encode** the JSON text.
6. **URL**: `https://<your-domain>/?import=` + the base64 output.
   Use the *Text* action to concatenate.
7. **Open URLs** → that URL.

Save the Shortcut. Long-press it → **Add to Home Screen** for true one-tap
access from the lock screen / today view.

## What the JSON looks like

```json
[
  { "date": "2026-05-13T22:14:00Z", "bpm": 92 },
  { "date": "2026-05-13T22:14:05Z", "bpm": 94 },
  …
]
```

The importer is permissive — it also accepts:

- `{ "samples": [ … ] }` wrapper
- Field names `recordedAt`, `timestamp`, `time`, `startDate`, `t`
- Field names `value`, `heartRate`, `hr`
- Plain CSV `iso-or-ms,bpm` (one per line)
- A pasted Apple Health XML export (`<Record type="HKQuantityTypeIdentifierHeartRate" …>`)

## Two-partner setup

Until the PocketBase backend is deployed, the two iPhones do not sync
sessions to each other. Workaround for now:

1. Each partner runs their own Shortcut on their own phone.
2. After the session, one partner exports their session
   (Sessions → Detail → *Export*, planned for next iteration) and emails
   it to the other, who imports it.

This is a known temporary friction point. Real two-device sync arrives
with V1 (PocketBase on a self-hosted VPS, account pairing via invite
code).
