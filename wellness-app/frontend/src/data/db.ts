import Dexie, { type Table } from 'dexie';

export interface Attempt {
  id?: number;
  presetId: string;
  triedAt: number;
  rating?: number;
  note?: string;
  updatedAt: number;
}

export interface Note {
  id?: number;
  title: string;
  body: string;
  linkedPreset?: string;
  createdAt: number;
  updatedAt: number;
}

class IntimacyDB extends Dexie {
  attempts!: Table<Attempt, number>;
  notes!: Table<Note, number>;

  constructor() {
    super('intimacy-geometry');
    this.version(1).stores({
      attempts: '++id, presetId, triedAt',
      notes: '++id, linkedPreset, updatedAt'
    });
  }
}

export const db = new IntimacyDB();
