import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { DualView } from './simulator/views/DualView';
import { ParamPanel } from './components/ParamPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { PresetList } from './components/PresetList';
import { AttemptsLog } from './components/AttemptsLog';
import { useSimStore } from './store/useSimStore';

type Tab = 'metrics' | 'params' | 'attempts';

export default function App() {
  const loadPreset = useSimStore(s => s.loadPreset);
  const presetId = useSimStore(s => s.presetId);
  const [rightTab, setRightTab] = useState<Tab>('metrics');

  useEffect(() => {
    if (!presetId) loadPreset('missionary');
  }, [presetId, loadPreset]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      <Toolbar />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px]">
        {/* Left rail: presets */}
        <aside className="border-r border-slate-800 min-h-0 hidden lg:block">
          <PresetList />
        </aside>

        {/* Center: dual 3D view */}
        <main className="flex flex-col min-h-0 min-w-0">
          <DualView />
        </main>

        {/* Right rail: tabbed metrics / params / attempts */}
        <aside className="border-l border-slate-800 min-h-0 flex flex-col hidden lg:flex">
          <div className="flex border-b border-slate-800 text-xs">
            {(['metrics', 'params', 'attempts'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-2 uppercase tracking-wider ${
                  rightTab === t
                    ? 'text-white border-b-2 border-teal-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightTab === 'metrics' && <MetricsPanel />}
            {rightTab === 'params' && <ParamPanel />}
            {rightTab === 'attempts' && <AttemptsLog />}
          </div>
        </aside>
      </div>

      {/* Mobile: stacked panels below the canvas */}
      <div className="lg:hidden border-t border-slate-800 max-h-[40vh] overflow-y-auto">
        <details className="border-b border-slate-800">
          <summary className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 cursor-pointer">
            Presets
          </summary>
          <PresetList />
        </details>
        <details className="border-b border-slate-800">
          <summary className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 cursor-pointer">
            Metrics
          </summary>
          <MetricsPanel />
        </details>
        <details className="border-b border-slate-800">
          <summary className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 cursor-pointer">
            Joints
          </summary>
          <ParamPanel />
        </details>
        <details>
          <summary className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 cursor-pointer">
            Attempts
          </summary>
          <AttemptsLog />
        </details>
      </div>
    </div>
  );
}
