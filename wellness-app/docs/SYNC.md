# PocketBase sync — server setup

The app can mirror its local IndexedDB store (sessions, attempts, notes, HR
samples) to a self-hosted PocketBase instance for cross-device sync and
backup. The frontend never talks to a hosted service — you run the server.

## 1. Run PocketBase

Download the platform binary from <https://pocketbase.io/docs/>, unzip, then:

```bash
./pocketbase serve --http 0.0.0.0:8090
```

On first start it prints an admin setup URL. Open it in a browser and create
the **admin** account (this is *not* the same account you'll log into the
app with).

For production: put it behind nginx/caddy with TLS and a real domain
(e.g. `pb.example.com`). The frontend stores the URL in localStorage; never
ship it embedded.

## 2. Create the collections

In the PocketBase admin UI, **Settings → Import collections**, paste the
JSON below (also at `wellness-app/docs/pocketbase-collections.json`), and
import. This creates four collections — `users` (PocketBase default),
`attempts`, `notes`, `sessions` — each gated by per-user list/view/create/
update/delete rules.

```jsonc
[
  {
    "name": "attempts",
    "type": "base",
    "schema": [
      { "name": "owner",    "type": "relation", "required": true, "options": { "collectionId": "_pb_users_auth_", "cascadeDelete": true, "maxSelect": 1 } },
      { "name": "clientId", "type": "text",    "required": true },
      { "name": "presetId", "type": "text",    "required": true },
      { "name": "triedAt",  "type": "number",  "required": true },
      { "name": "rating",   "type": "number" },
      { "name": "note",     "type": "text" },
      { "name": "updatedAt","type": "number",  "required": true }
    ],
    "listRule":   "owner = @request.auth.id",
    "viewRule":   "owner = @request.auth.id",
    "createRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id",
    "deleteRule": "owner = @request.auth.id"
  },
  {
    "name": "notes",
    "type": "base",
    "schema": [
      { "name": "owner",        "type": "relation", "required": true, "options": { "collectionId": "_pb_users_auth_", "cascadeDelete": true, "maxSelect": 1 } },
      { "name": "clientId",     "type": "text",    "required": true },
      { "name": "title",        "type": "text",    "required": true },
      { "name": "body",         "type": "text" },
      { "name": "linkedPreset", "type": "text" },
      { "name": "createdAt",    "type": "number",  "required": true },
      { "name": "updatedAt",    "type": "number",  "required": true }
    ],
    "listRule":   "owner = @request.auth.id",
    "viewRule":   "owner = @request.auth.id",
    "createRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id",
    "deleteRule": "owner = @request.auth.id"
  },
  {
    "name": "sessions",
    "type": "base",
    "schema": [
      { "name": "owner",     "type": "relation", "required": true, "options": { "collectionId": "_pb_users_auth_", "cascadeDelete": true, "maxSelect": 1 } },
      { "name": "clientId",  "type": "text",    "required": true },
      { "name": "startedAt", "type": "number",  "required": true },
      { "name": "endedAt",   "type": "number" },
      { "name": "context",   "type": "text" },
      { "name": "ratingA",   "type": "number" },
      { "name": "ratingB",   "type": "number" },
      { "name": "updatedAt", "type": "number",  "required": true },
      { "name": "actsJson",  "type": "text",    "options": { "max": 1000000 } },
      { "name": "notesJson", "type": "text",    "options": { "max": 1000000 } },
      { "name": "hrJson",    "type": "text",    "options": { "max": 5000000 } }
    ],
    "listRule":   "owner = @request.auth.id",
    "viewRule":   "owner = @request.auth.id",
    "createRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id",
    "deleteRule": "owner = @request.auth.id"
  }
]
```

> **Important:** the rules above scope every record to the authenticated user.
> Make sure the `owner` field is auto-filled by your client — the current
> sync code does NOT yet stamp `owner`, so as a first iteration **set
> `listRule`/`viewRule`/etc. to `@request.auth.id != ''`** during testing
> and tighten once owner-stamping is added (see *Limitations* below).

## 3. Create a user

In the admin UI, **Users → New record**: pick an email and password. This
is the account you'll log into from the app's Sync panel.

## 4. Configure the app

In the app, open the **Sync** tab (right rail):

1. **Server URL** — `http://localhost:8090` for local, or your real domain.
2. **Email** / **Password** — the user account from step 3.
3. Click **Connect**, then **Sync now**.

The URL is remembered in localStorage; credentials are not.

## Conflict resolution

V1 is last-write-wins by `updatedAt`. If you edit the same record on two
devices, the later edit wins after both have synced. There is no merge UI.

## What's synced

| Table          | How                                                  |
|----------------|------------------------------------------------------|
| `attempts`     | One PB row per local row.                            |
| `notes`        | One PB row per local row.                            |
| `sessions`     | One PB row per local row.                            |
| `sessionActs`  | Embedded as JSON inside the parent session row.      |
| `sessionNotes` | Embedded as JSON inside the parent session row.      |
| `hrSamples`    | Embedded as JSON inside the parent session row.      |

The embedded-children approach was chosen for V1 simplicity (no FK
resolution between local int IDs and PB string IDs). It means you can't
query sessionActs / HR samples directly on the PB side — but that's fine
for personal use. If you need that, the upgrade path is to move children
into their own collections with a relation to the parent session.

## Limitations (V1)

- No `owner` stamping yet. The client doesn't add the authenticated user's
  id to each record. Use `@request.auth.id != ''` collection rules until
  this is fixed.
- No realtime subscriptions — sync runs on demand.
- HR samples can produce large `hrJson` blobs (~100 KB per 30-min session
  at 1 Hz). PocketBase's text column max is 5 MB which is plenty for normal
  use but worth knowing.
- No incremental sync; every push iterates every local row. Fine until you
  accumulate thousands of sessions.

## Roadmap

- Stamp `owner = @request.auth.id` on create; revert collection rules to
  proper per-user scoping.
- Subscribe to the PocketBase realtime channel so remote edits land
  immediately without a manual "Sync now".
- Move sessionActs / HR samples into proper relational collections once a
  generic FK-resolution layer exists.
