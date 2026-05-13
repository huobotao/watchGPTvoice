import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, startNewSession, type Session } from '@/data/db';
import { SessionDetail } from './SessionDetail';

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function durationLabel(s: Session): string {
  if (!s.endedAt) return 'ongoing';
  const mins = Math.round((s.endedAt - s.startedAt) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function SessionsPanel({
  pendingImportText,
  onConsumeImport
}: {
  pendingImportText?: string;
  onConsumeImport?(): void;
}) {
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []);
  const [activeId, setActiveId] = useState<number | null>(null);

  // If a one-tap import arrived, default to the latest session.
  useEffect(() => {
    if (pendingImportText && activeId == null && sessions && sessions.length > 0) {
      setActiveId(sessions[0].id!);
    }
  }, [pendingImportText, activeId, sessions]);

  const active = sessions?.find(s => s.id === activeId) ?? null;

  async function createAndOpen() {
    const id = await startNewSession();
    setActiveId(id);
  }

  async function removeSession(id: number) {
    if (!confirm('Delete this session and all its data?')) return;
    await db.transaction('rw', db.sessions, db.sessionActs, db.sessionNotes, db.hrSamples, async () => {
      await db.sessionActs.where('sessionId').equals(id).delete();
      await db.sessionNotes.where('sessionId').equals(id).delete();
      await db.hrSamples.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    });
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-400">Sessions</h2>
        <button
          onClick={createAndOpen}
          className="px-2 py-1 text-xs rounded bg-teal-700 hover:bg-teal-600 text-white"
        >
          + New
        </button>
      </div>

      {active ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1 border-b border-slate-800 text-xs">
            <button
              onClick={() => setActiveId(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ‹ Back
            </button>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-slate-300">#{active.id}</span>
            <div className="flex-1" />
            <button
              onClick={() => removeSession(active.id!)}
              className="text-slate-500 hover:text-red-400"
            >
              Delete
            </button>
          </div>
          <SessionDetail
            session={active}
            initialImportText={pendingImportText}
            onClearImportText={onConsumeImport}
          />
        </>
      ) : (
        <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1">
          {(sessions ?? []).length === 0 && (
            <div className="text-xs text-slate-500 px-1 py-2">
              No sessions yet. Tap <span className="text-teal-400">+ New</span> to start one.
            </div>
          )}
          {(sessions ?? []).map(s => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id!)}
              className="w-full text-left px-2 py-2 rounded bg-slate-900/50 hover:bg-slate-800 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-200">{formatDate(s.startedAt)}</span>
                <span className="text-[10px] text-slate-500">{durationLabel(s)}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {s.ratingA ? `A:${'★'.repeat(s.ratingA)} ` : ''}
                {s.ratingB ? `B:${'★'.repeat(s.ratingB)}` : ''}
                {!s.ratingA && !s.ratingB && <span className="text-slate-600">no rating yet</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
