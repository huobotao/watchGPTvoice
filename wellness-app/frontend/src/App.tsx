import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { DualView } from './simulator/views/DualView';
import { ParamPanel } from './components/ParamPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { PresetList } from './components/PresetList';
import { AttemptsLog } from './components/AttemptsLog';
import { SessionsPanel } from './components/SessionsPanel';
import { useSimStore } from './store/useSimStore';
import { decodeImportParam } from './data/hrImport';

type Tab = 'sessions' | 'metrics' | 'params' | 'attempts';

function consumeImportFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('import');
  if (!value) return null;
  // Strip the param so a refresh doesn't re-import.
  params.delete('import');
  const newSearch = params.toString();
  const newUrl =
    window.location.pathname +
    (newSearch ? `?${newSearch}` : '') +
    window.location.hash;
  window.history.replaceState(null, '', newUrl);
  return decodeImportParam(value);
}

export default function App() {
  const loadPreset = useSimStore(s => s.loadPreset);
  const presetId = useSimStore(s => s.presetId);
  const [rightTab, setRightTab] = useState<Tab>('sessions');
  const [pendingImportText, setPendingImportText] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!presetId) loadPreset('missionary');
  }, [presetId, loadPreset]);

  useEffect(() => {
    const text = consumeImportFromUrl();
    if (text) {
      setPendingImportText(text);
      setRightTab('sessions');
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      <Toolbar />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_360px]">
        {/* Left rail: presets */}
        <aside className="border-r border-slate-800 min-h-0 hidden lg:block">
          <PresetList />
        </aside>

        {/* Center: dual 3D view */}
        <main className="flex flex-col min-h-0 min-w-0">
          <DualView />
        </main>

        {/* Right rail: tabbed sessions / metrics / params / attempts */}
        <aside className="border-l border-slate-800 min-h-0 flex flex-col hidden lg:flex">
          <div className="flex border-b border-slate-800 text-xs">
            {(['sessions', 'metrics', 'params', 'attempts'] as Tab[]).map(t => (
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
            {rightTab === 'sessions' && (
              <SessionsPanel
                pendingImportText={pendingImportText}
                onConsumeImport={() => setPendingImportText(undefined)}
              />
            )}
            {rightTab === 'metrics' && <MetricsPanel />}
            {rightTab === 'params' && <ParamPanel />}
            {rightTab === 'attempts' && <AttemptsLog />}
          </div>
        </aside>
      </div>

      {/* Mobile: stacked panels below the canvas */}
      <div className="lg:hidden border-t border-slate-800 max-h-[55vh] overflow-y-auto">
        <details open={!!pendingImportText} className="border-b border-slate-800">
          <summary className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 cursor-pointer">
            Sessions {pendingImportText && <span className="text-teal-400">• import pending</span>}
          </summary>
          <SessionsPanel
            pendingImportText={pendingImportText}
            onConsumeImport={() => setPendingImportText(undefined)}
          />
        </details>
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
