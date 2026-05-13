import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, endSession, type Partner, type Session } from '@/data/db';
import { useSimStore, PRESETS } from '@/store/useSimStore';
import { HrChart } from './HrChart';
import { HrImport } from './HrImport';

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function SessionDetail({
  session,
  initialImportText,
  onClearImportText
}: {
  session: Session;
  initialImportText?: string;
  onClearImportText?(): void;
}) {
  const sessionId = session.id!;
  const presetId = useSimStore(s => s.presetId);
  const [showImport, setShowImport] = useState(false);
  const [partner, setPartner] = useState<Partner>('A');

  const acts = useLiveQuery(
    () => db.sessionActs.where('sessionId').equals(sessionId).sortBy('ordinal'),
    [sessionId]
  );
  const notes = useLiveQuery(
    () => db.sessionNotes.where('sessionId').equals(sessionId).toArray(),
    [sessionId]
  );
  const hr = useLiveQuery(
    () => db.hrSamples.where('sessionId').equals(sessionId).sortBy('recordedAt'),
    [sessionId]
  );

  useEffect(() => {
    if (initialImportText) {
      setShowImport(true);
    }
  }, [initialImportText]);

  async function addCurrentPreset() {
    if (!presetId) return;
    const next = (acts?.length ?? 0) + 1;
    await db.sessionActs.add({
      sessionId,
      presetId,
      ordinal: next,
      offsetSeconds: Math.round((Date.now() - session.startedAt) / 1000)
    });
  }

  async function removeAct(id?: number) {
    if (id != null) await db.sessionActs.delete(id);
  }

  async function setRating(p: Partner, value: number) {
    await db.sessions.update(sessionId, {
      [p === 'A' ? 'ratingA' : 'ratingB']: value,
      updatedAt: Date.now()
    });
  }

  const partnerNote = notes?.find(n => n.partner === partner);
  async function setNoteBody(body: string) {
    const now = Date.now();
    if (partnerNote?.id != null) {
      await db.sessionNotes.update(partnerNote.id, { body, updatedAt: now });
    } else {
      await db.sessionNotes.add({
        sessionId,
        partner,
        body,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  async function setNoteTags(tagText: string) {
    const tags = tagText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const now = Date.now();
    if (partnerNote?.id != null) {
      await db.sessionNotes.update(partnerNote.id, { tags, updatedAt: now });
    } else {
      await db.sessionNotes.add({
        sessionId,
        partner,
        body: '',
        tags,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  const currentRating = partner === 'A' ? session.ratingA : session.ratingB;

  return (
    <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3 text-xs">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-mono text-slate-300">
            {formatDateTime(session.startedAt)}
            {session.endedAt && (
              <> → <span className="text-slate-500">{formatDateTime(session.endedAt)}</span></>
            )}
          </div>
          {!session.endedAt && (
            <button
              onClick={() => endSession(sessionId)}
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              End now
            </button>
          )}
        </div>
        {session.context && <div className="text-slate-400">{session.context}</div>}
      </div>

      {/* Partner switcher */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Perspective:</span>
        {(['A', 'B'] as Partner[]).map(p => (
          <button
            key={p}
            onClick={() => setPartner(p)}
            className={`px-2 py-0.5 rounded ${
              partner === p
                ? p === 'A'
                  ? 'bg-teal-700 text-white'
                  : 'bg-orange-700 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Partner {p}
          </button>
        ))}
      </div>

      {/* Rating per partner */}
      <div>
        <div className="text-slate-400 mb-1">Rating ({partner})</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(partner, currentRating === n ? 0 : n)}
              className={`w-7 h-7 rounded ${
                n <= (currentRating ?? 0) ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Practices used */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-slate-400">Practices used</div>
          <button
            onClick={addCurrentPreset}
            disabled={!presetId}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200"
          >
            + Add current preset
          </button>
        </div>
        <div className="space-y-1">
          {(acts ?? []).map(a => {
            const p = PRESETS.find(p => p.id === a.presetId);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded px-2 py-1"
              >
                <div>
                  <span className="text-slate-200">{p?.name ?? a.presetId}</span>
                  {a.offsetSeconds != null && (
                    <span className="ml-2 text-slate-500 font-mono">
                      +{Math.floor(a.offsetSeconds / 60)}m
                    </span>
                  )}
                </div>
                <button onClick={() => removeAct(a.id)} className="text-slate-500 hover:text-red-400">
                  ✕
                </button>
              </div>
            );
          })}
          {(acts?.length ?? 0) === 0 && (
            <div className="text-slate-500">No practices logged yet — pick a preset and click "+ Add current preset".</div>
          )}
        </div>
      </div>

      {/* Notes per partner */}
      <div>
        <div className="text-slate-400 mb-1">Notes ({partner})</div>
        <textarea
          value={partnerNote?.body ?? ''}
          onChange={e => setNoteBody(e.target.value)}
          rows={4}
          placeholder="How did it feel? What worked? What surprised you?"
          className="w-full bg-slate-800 text-slate-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 resize-y"
        />
        <input
          type="text"
          value={partnerNote?.tags?.join(', ') ?? ''}
          onChange={e => setNoteTags(e.target.value)}
          placeholder="tags, comma separated (e.g. fingers, slow, eye-contact)"
          className="mt-1 w-full bg-slate-800 text-slate-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Heart rate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-slate-400">Heart rate</div>
          <button
            onClick={() => setShowImport(s => !s)}
            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
          >
            {showImport ? 'Hide' : 'Import'}
          </button>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded">
          <HrChart samples={hr ?? []} />
        </div>
        {(hr?.length ?? 0) > 0 && (
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            {hr!.length} samples · A: {hr!.filter(s => s.partner === 'A').length} · B:{' '}
            {hr!.filter(s => s.partner === 'B').length}
          </div>
        )}
        {showImport && (
          <div className="mt-2">
            <HrImport
              sessionId={sessionId}
              initialText={initialImportText}
              onClose={() => {
                setShowImport(false);
                onClearImportText?.();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
