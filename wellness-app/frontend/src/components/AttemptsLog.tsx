import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Attempt } from '@/data/db';
import { useSimStore } from '@/store/useSimStore';

function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function AttemptsLog() {
  const presetId = useSimStore(s => s.presetId);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<number>(0);

  const attempts =
    useLiveQuery(
      async () =>
        presetId
          ? db.attempts.where('presetId').equals(presetId).reverse().sortBy('triedAt')
          : db.attempts.orderBy('triedAt').reverse().limit(10).toArray(),
      [presetId]
    ) ?? [];

  async function logAttempt() {
    if (!presetId) return;
    const now = Date.now();
    await db.attempts.add({
      presetId,
      triedAt: now,
      rating: rating || undefined,
      note: note.trim() || undefined,
      updatedAt: now
    });
    setNote('');
    setRating(0);
  }

  async function remove(a: Attempt) {
    if (a.id != null) await db.attempts.delete(a.id);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-400">Attempts log</h2>
      </div>

      {presetId ? (
        <div className="px-3 py-2 border-b border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Rating:</span>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`w-6 h-6 rounded ${
                  n <= rating ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Optional notes for this attempt"
            className="w-full bg-slate-800 text-slate-100 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 resize-none"
          />
          <button
            onClick={logAttempt}
            className="w-full text-xs py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white"
          >
            Mark as tried (now)
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-800">
          Select a preset to log attempts.
        </div>
      )}

      <div className="overflow-y-auto flex-1 px-3 py-2 space-y-1.5">
        {attempts.length === 0 && (
          <div className="text-xs text-slate-500">No attempts yet.</div>
        )}
        {attempts.map(a => (
          <div
            key={a.id}
            className="text-xs bg-slate-900/50 border border-slate-800 rounded px-2 py-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-400">{formatDate(a.triedAt)}</span>
              <div className="flex items-center gap-2">
                {a.rating ? <span className="text-amber-400">{'★'.repeat(a.rating)}</span> : null}
                <button onClick={() => remove(a)} className="text-slate-500 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>
            {!presetId && (
              <div className="text-[10px] text-slate-500 mt-0.5">preset: {a.presetId}</div>
            )}
            {a.note && <div className="text-slate-200 mt-1 whitespace-pre-wrap">{a.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
