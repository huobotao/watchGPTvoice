import { useSimStore, PRESETS } from '@/store/useSimStore';

export function PresetList() {
  const presetId = useSimStore(s => s.presetId);
  const loadPreset = useSimStore(s => s.loadPreset);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-400">Presets</h2>
      </div>
      <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1">
        {PRESETS.map(p => {
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
              <div className="font-semibold">{p.name}</div>
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
