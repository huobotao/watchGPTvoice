import { useState } from 'react';
import { parseHrPayload, saveHrSamples } from '@/data/hrImport';
import type { Partner } from '@/data/db';

interface Props {
  sessionId: number;
  /** Optional pre-filled text — used by the URL-based one-tap importer. */
  initialText?: string;
  onClose(): void;
}

export function HrImport({ sessionId, initialText = '', onClose }: Props) {
  const [text, setText] = useState(initialText);
  const [partner, setPartner] = useState<Partner>('A');
  const parsed = parseHrPayload(text);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  async function save() {
    const n = await saveHrSamples(sessionId, partner, parsed.samples, 'watch');
    setSavedCount(n);
  }

  return (
    <div className="border border-slate-700 rounded p-3 bg-slate-900/60 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-slate-400">Import heart rate</div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Partner:</span>
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
            {p}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={e => {
          setText(e.target.value);
          setSavedCount(null);
        }}
        rows={5}
        placeholder={
          'Paste Shortcut JSON, CSV (timestamp,bpm), or Apple Health XML export.\nE.g. [{"date":"2026-05-13T22:14:00Z","bpm":92}, ...]'
        }
        className="w-full bg-slate-800 text-slate-100 text-xs font-mono rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 resize-y"
      />

      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-400">
          {parsed.error ? (
            <span className="text-red-400">{parsed.error}</span>
          ) : (
            <>
              <span className="text-slate-500">{parsed.sourceLabel} →</span>{' '}
              <span className="text-slate-200">{parsed.samples.length}</span> samples
              {parsed.samples.length > 0 && (
                <>
                  {' '}
                  <span className="text-slate-500">
                    ({parsed.samples[0].bpm}–
                    {parsed.samples[parsed.samples.length - 1].bpm} bpm)
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <button
          onClick={save}
          disabled={parsed.samples.length === 0}
          className="px-3 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white disabled:bg-slate-700 disabled:text-slate-500"
        >
          Save to session
        </button>
      </div>

      {savedCount !== null && (
        <div className="text-xs text-emerald-400">Saved {savedCount} samples.</div>
      )}
    </div>
  );
}
