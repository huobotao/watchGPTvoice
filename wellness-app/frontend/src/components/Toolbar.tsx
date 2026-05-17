import { useSimStore, type ViewMode } from '@/store/useSimStore';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'dual', label: 'Dual' },
  { id: 'schematic', label: 'Schematic' },
  { id: 'mannequin', label: 'Mannequin' }
];

export function Toolbar() {
  const viewMode = useSimStore(s => s.viewMode);
  const setViewMode = useSimStore(s => s.setViewMode);
  const showLabels = useSimStore(s => s.showLabels);
  const toggleLabels = useSimStore(s => s.toggleLabels);
  const showHandles = useSimStore(s => s.showHandles);
  const toggleHandles = useSimStore(s => s.toggleHandles);
  const resetToRest = useSimStore(s => s.resetToRest);
  const presetId = useSimStore(s => s.presetId);

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800 bg-slate-900/40">
      <div className="font-mono text-xs text-slate-300">
        <span className="text-slate-500">intimacy-geometry</span>
        {presetId && <span className="ml-2 text-slate-100">› {presetId}</span>}
      </div>

      <div className="flex bg-slate-800 rounded overflow-hidden text-xs">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className={`px-3 py-1 ${
              viewMode === m.id ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={toggleLabels}
        className={`text-xs px-2 py-1 rounded border border-slate-700 ${
          showLabels ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Labels: {showLabels ? 'on' : 'off'}
      </button>

      <button
        onClick={toggleHandles}
        title="Drag the colored balls on hands/feet/pelvis to pose with inverse kinematics"
        className={`text-xs px-2 py-1 rounded border border-slate-700 ${
          showHandles ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Drag: {showHandles ? 'on' : 'off'}
      </button>

      <div className="flex-1" />

      <button
        onClick={resetToRest}
        className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        Reset to rest
      </button>
    </div>
  );
}
