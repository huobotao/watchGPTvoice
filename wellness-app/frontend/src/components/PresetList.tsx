import { useMemo, useState } from 'react';
import { useSimStore, PRESETS } from '@/store/useSimStore';
import type { PresetCategory } from '@/simulator/presets';

type Filter = 'all' | PresetCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'basic', label: 'Basic' },
  { id: 'intermediate', label: 'Inter.' },
  { id: 'advanced', label: 'Advanced' }
];

const CATEGORY_BADGE: Record<PresetCategory, string> = {
  basic: 'bg-emerald-900/60 text-emerald-200',
  intermediate: 'bg-amber-900/60 text-amber-200',
  advanced: 'bg-rose-900/60 text-rose-200'
};

export function PresetList() {
  const presetId = useSimStore(s => s.presetId);
  const loadPreset = useSimStore(s => s.loadPreset);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRESETS.filter(p => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [filter, query]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-slate-400">Presets</h2>
          <span className="text-[10px] text-slate-500">
            {filtered.length} / {PRESETS.length}
          </span>
        </div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, tag, summary…"
          className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
        />
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                filter === f.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1">
        {filtered.length === 0 && (
          <div className="text-center text-xs text-slate-500 py-6">No matches.</div>
        )}
        {filtered.map(p => {
          const active = p.id === presetId;
          return (
            <button
              key={p.id}
              onClick={() => loadPreset(p.id)}
              className={`w-full text-left px-2 py-2 rounded text-xs transition-colors ${
                active
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900/50 hover:bg-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{p.name}</div>
                <span
                  className={`text-[9px] uppercase tracking-wide px-1 py-px rounded shrink-0 ${
                    CATEGORY_BADGE[p.category]
                  }`}
                >
                  {p.category}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.summary}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.tags.map(t => (
                  <span
                    key={t}
                    className="text-[9px] uppercase tracking-wide px-1 py-px rounded bg-slate-700 text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
