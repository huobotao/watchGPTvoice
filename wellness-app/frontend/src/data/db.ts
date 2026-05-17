import Dexie, { type Table } from 'dexie';

export type Partner = 'A' | 'B';

export interface Attempt {
  id?: number;
  presetId: string;
  triedAt: number;
  rating?: number;
  note?: string;
  updatedAt: number;
  /** PocketBase record id if synced (V3+). */
  pbId?: string;
}

export interface Note {
  id?: number;
  title: string;
  body: string;
  linkedPreset?: string;
  createdAt: number;
  updatedAt: number;
  pbId?: string;
}

/** A "session" = one occasion. Two partners may each contribute notes & HR data. */
export interface Session {
  id?: number;
  startedAt: number;
  endedAt?: number;
  /** Free-form location/context tag, e.g. "home / evening / weekday". */
  context?: string;
  /** Overall rating per partner. */
  ratingA?: number;
  ratingB?: number;
  updatedAt: number;
  pbId?: string;
}

/** Which preset/technique was practised during a session, optionally with timing. */
export interface SessionAct {
  id?: number;
  sessionId: number;
  presetId: string;
  /** Ordinal index of this act within the session. */
  ordinal: number;
  /** Approximate offset from session start, seconds (optional). */
  offsetSeconds?: number;
  /** Approximate duration, seconds (optional). */
  durationSeconds?: number;
  note?: string;
}

/** Free-form per-partner notes attached to a session. */
export interface SessionNote {
  id?: number;
  sessionId: number;
  partner: Partner;
  body: string;
  /** Tags representing techniques/sensations, e.g. ["fingers","slow"]. */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

/** A single heart-rate sample for one partner, attributed to a session. */
export interface HrSample {
  id?: number;
  sessionId: number;
  partner: Partner;
  /** Source: 'watch' (Apple Watch via Shortcut/HealthKit) or 'manual'. */
  source: 'watch' | 'manual';
  /** Absolute timestamp of this sample (ms). */
  recordedAt: number;
  bpm: number;
}

class IntimacyDB extends Dexie {
  attempts!: Table<Attempt, number>;
  notes!: Table<Note, number>;
  sessions!: Table<Session, number>;
  sessionActs!: Table<SessionAct, number>;
  sessionNotes!: Table<SessionNote, number>;
  hrSamples!: Table<HrSample, number>;

  constructor() {
    super('intimacy-geometry');
    this.version(1).stores({
      attempts: '++id, presetId, triedAt',
      notes: '++id, linkedPreset, updatedAt'
    });
    this.version(2).stores({
      attempts: '++id, presetId, triedAt',
      notes: '++id, linkedPreset, updatedAt',
      sessions: '++id, startedAt, endedAt',
      sessionActs: '++id, sessionId, ordinal',
      sessionNotes: '++id, sessionId, partner',
      hrSamples: '++id, sessionId, partner, recordedAt'
    });
    // V3: index pbId so sync lookups are O(log n).
    this.version(3).stores({
      attempts: '++id, presetId, triedAt, pbId',
      notes: '++id, linkedPreset, updatedAt, pbId',
      sessions: '++id, startedAt, endedAt, pbId',
      sessionActs: '++id, sessionId, ordinal',
      sessionNotes: '++id, sessionId, partner',
      hrSamples: '++id, sessionId, partner, recordedAt'
    });
  }
}

export const db = new IntimacyDB();

/** Convenience: create a new session that starts now and return its id. */
export async function startNewSession(context?: string): Promise<number> {
  const now = Date.now();
  return db.sessions.add({ startedAt: now, context, updatedAt: now });
}

/** Convenience: stamp endedAt on a session. */
export async function endSession(id: number): Promise<void> {
  const now = Date.now();
  await db.sessions.update(id, { endedAt: now, updatedAt: now });
}
