// PocketBase sync — push / pull local Dexie data to a self-hosted PocketBase
// backend. V1 design choices:
//   • Last-write-wins per record, keyed by `updatedAt`.
//   • Each session's child records (acts, notes, HR samples) are embedded as
//     JSON in the parent session row. Sidesteps FK resolution; the trade-off
//     is that you can't query individual acts/notes on the PB side. Suitable
//     for personal use; revisit if multi-tenant queries are needed.
//   • Auth uses PocketBase user collection password auth. URL persists in
//     localStorage; credentials never do.

import PocketBase, { type RecordModel } from 'pocketbase';
import { db, type Attempt, type Note, type Session, type SessionAct, type SessionNote, type HrSample } from './db';

const URL_KEY = 'sync.pb.url';
const LAST_SYNC_KEY = 'sync.pb.lastSyncAt';

export interface SyncStatus {
  url: string | null;
  connected: boolean;
  authedAs: string | null;
  lastSyncAt: number | null;
  busy: boolean;
  lastError: string | null;
  lastMessage: string | null;
}

type Listener = (s: SyncStatus) => void;

class SyncController {
  private pb: PocketBase | null = null;
  private authedAs: string | null = null;
  private busy = false;
  private lastError: string | null = null;
  private lastMessage: string | null = null;
  private listeners = new Set<Listener>();

  get url(): string | null {
    return localStorage.getItem(URL_KEY);
  }
  get lastSyncAt(): number | null {
    const v = localStorage.getItem(LAST_SYNC_KEY);
    return v ? Number(v) : null;
  }

  status(): SyncStatus {
    return {
      url: this.url,
      connected: !!this.pb && !!this.authedAs,
      authedAs: this.authedAs,
      lastSyncAt: this.lastSyncAt,
      busy: this.busy,
      lastError: this.lastError,
      lastMessage: this.lastMessage
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status());
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const s = this.status();
    for (const fn of this.listeners) fn(s);
  }

  async connect(url: string, email: string, password: string): Promise<void> {
    this.busy = true;
    this.lastError = null;
    this.lastMessage = 'Connecting…';
    this.notify();
    try {
      const trimmed = url.replace(/\/+$/, '');
      const client = new PocketBase(trimmed);
      const auth = await client.collection('users').authWithPassword(email, password);
      this.pb = client;
      this.authedAs = auth.record.email as string;
      localStorage.setItem(URL_KEY, trimmed);
      this.lastMessage = `Connected as ${this.authedAs}`;
    } catch (err) {
      this.lastError = formatErr(err);
      this.pb = null;
      this.authedAs = null;
      throw err;
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  disconnect(): void {
    this.pb?.authStore.clear();
    this.pb = null;
    this.authedAs = null;
    this.lastMessage = 'Disconnected';
    this.notify();
  }

  async syncNow(): Promise<void> {
    if (!this.pb || !this.authedAs) throw new Error('Not connected');
    this.busy = true;
    this.lastError = null;
    this.notify();
    try {
      this.lastMessage = 'Pushing local changes…';
      this.notify();
      await this.pushAll();
      this.lastMessage = 'Pulling remote changes…';
      this.notify();
      await this.pullAll();
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, String(now));
      this.lastMessage = 'Synced.';
    } catch (err) {
      this.lastError = formatErr(err);
      throw err;
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  // ─────────────────── push ────────────────────
  private async pushAll(): Promise<void> {
    if (!this.pb) return;
    const pb = this.pb;

    // attempts (flat)
    const attempts = await db.attempts.toArray();
    for (const a of attempts) {
      const payload = {
        clientId: String(a.id),
        presetId: a.presetId,
        triedAt: a.triedAt,
        rating: a.rating ?? null,
        note: a.note ?? '',
        updatedAt: a.updatedAt
      };
      if (a.pbId) {
        const remote = await pb.collection('attempts').getOne(a.pbId).catch(() => null);
        if (!remote || (remote.updatedAt ?? 0) < a.updatedAt) {
          await pb.collection('attempts').update(a.pbId, payload);
        }
      } else {
        const created = await pb.collection('attempts').create(payload);
        await db.attempts.update(a.id!, { pbId: created.id });
      }
    }

    // notes (flat)
    const notes = await db.notes.toArray();
    for (const n of notes) {
      const payload = {
        clientId: String(n.id),
        title: n.title,
        body: n.body,
        linkedPreset: n.linkedPreset ?? '',
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      };
      if (n.pbId) {
        const remote = await pb.collection('notes').getOne(n.pbId).catch(() => null);
        if (!remote || (remote.updatedAt ?? 0) < n.updatedAt) {
          await pb.collection('notes').update(n.pbId, payload);
        }
      } else {
        const created = await pb.collection('notes').create(payload);
        await db.notes.update(n.id!, { pbId: created.id });
      }
    }

    // sessions (with embedded children)
    const sessions = await db.sessions.toArray();
    for (const s of sessions) {
      const acts = await db.sessionActs.where('sessionId').equals(s.id!).sortBy('ordinal');
      const sNotes = await db.sessionNotes.where('sessionId').equals(s.id!).toArray();
      const hr = await db.hrSamples.where('sessionId').equals(s.id!).toArray();
      const payload = {
        clientId: String(s.id),
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        context: s.context ?? '',
        ratingA: s.ratingA ?? null,
        ratingB: s.ratingB ?? null,
        updatedAt: s.updatedAt,
        actsJson: JSON.stringify(acts.map(stripId)),
        notesJson: JSON.stringify(sNotes.map(stripId)),
        hrJson: JSON.stringify(hr.map(stripId))
      };
      if (s.pbId) {
        const remote = await pb.collection('sessions').getOne(s.pbId).catch(() => null);
        if (!remote || (remote.updatedAt ?? 0) < s.updatedAt) {
          await pb.collection('sessions').update(s.pbId, payload);
        }
      } else {
        const created = await pb.collection('sessions').create(payload);
        await db.sessions.update(s.id!, { pbId: created.id });
      }
    }
  }

  // ─────────────────── pull ────────────────────
  private async pullAll(): Promise<void> {
    if (!this.pb) return;
    const pb = this.pb;

    // attempts
    const remoteAttempts = await pb.collection('attempts').getFullList<RecordModel>({ batch: 200 });
    const localAttemptsByPb = new Map<string, Attempt>();
    for (const a of await db.attempts.toArray()) {
      if (a.pbId) localAttemptsByPb.set(a.pbId, a);
    }
    for (const r of remoteAttempts) {
      const local = localAttemptsByPb.get(r.id);
      const remoteData: Omit<Attempt, 'id'> = {
        presetId: r.presetId,
        triedAt: Number(r.triedAt),
        rating: r.rating ?? undefined,
        note: r.note || undefined,
        updatedAt: Number(r.updatedAt),
        pbId: r.id
      };
      if (!local) {
        await db.attempts.add(remoteData as Attempt);
      } else if ((local.updatedAt ?? 0) < remoteData.updatedAt) {
        await db.attempts.update(local.id!, remoteData);
      }
    }

    // notes
    const remoteNotes = await pb.collection('notes').getFullList<RecordModel>({ batch: 200 });
    const localNotesByPb = new Map<string, Note>();
    for (const n of await db.notes.toArray()) {
      if (n.pbId) localNotesByPb.set(n.pbId, n);
    }
    for (const r of remoteNotes) {
      const local = localNotesByPb.get(r.id);
      const remoteData: Omit<Note, 'id'> = {
        title: r.title,
        body: r.body,
        linkedPreset: r.linkedPreset || undefined,
        createdAt: Number(r.createdAt),
        updatedAt: Number(r.updatedAt),
        pbId: r.id
      };
      if (!local) {
        await db.notes.add(remoteData as Note);
      } else if ((local.updatedAt ?? 0) < remoteData.updatedAt) {
        await db.notes.update(local.id!, remoteData);
      }
    }

    // sessions (with embedded children)
    const remoteSessions = await pb.collection('sessions').getFullList<RecordModel>({ batch: 100 });
    const localSessionsByPb = new Map<string, Session>();
    for (const s of await db.sessions.toArray()) {
      if (s.pbId) localSessionsByPb.set(s.pbId, s);
    }
    for (const r of remoteSessions) {
      const local = localSessionsByPb.get(r.id);
      const remoteSession: Omit<Session, 'id'> = {
        startedAt: Number(r.startedAt),
        endedAt: r.endedAt != null ? Number(r.endedAt) : undefined,
        context: r.context || undefined,
        ratingA: r.ratingA ?? undefined,
        ratingB: r.ratingB ?? undefined,
        updatedAt: Number(r.updatedAt),
        pbId: r.id
      };
      const acts = safeParse<SessionAct[]>(r.actsJson, []);
      const sNotes = safeParse<SessionNote[]>(r.notesJson, []);
      const hr = safeParse<HrSample[]>(r.hrJson, []);

      if (!local) {
        const newId = await db.sessions.add(remoteSession as Session);
        await replaceChildren(newId, acts, sNotes, hr);
      } else if ((local.updatedAt ?? 0) < remoteSession.updatedAt) {
        await db.sessions.update(local.id!, remoteSession);
        await replaceChildren(local.id!, acts, sNotes, hr);
      }
    }
  }
}

function stripId<T extends { id?: number; sessionId?: number }>(row: T): Omit<T, 'id' | 'sessionId'> {
  const { id: _id, sessionId: _sid, ...rest } = row as any;
  return rest;
}

async function replaceChildren(
  sessionId: number,
  acts: SessionAct[],
  notes: SessionNote[],
  hr: HrSample[]
): Promise<void> {
  // Wipe and reinsert — simpler than diff-merging embedded children.
  await db.sessionActs.where('sessionId').equals(sessionId).delete();
  await db.sessionNotes.where('sessionId').equals(sessionId).delete();
  await db.hrSamples.where('sessionId').equals(sessionId).delete();
  if (acts.length) await db.sessionActs.bulkAdd(acts.map(a => ({ ...a, sessionId })));
  if (notes.length) await db.sessionNotes.bulkAdd(notes.map(n => ({ ...n, sessionId })));
  if (hr.length) await db.hrSamples.bulkAdd(hr.map(s => ({ ...s, sessionId })));
}

function safeParse<T>(input: unknown, fallback: T): T {
  if (typeof input !== 'string' || !input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function formatErr(err: unknown): string {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export const sync = new SyncController();
