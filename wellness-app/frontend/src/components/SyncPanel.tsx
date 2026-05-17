import { useEffect, useState } from 'react';
import { sync, type SyncStatus } from '@/data/sync';

function fmtAgo(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function SyncPanel() {
  const [status, setStatus] = useState<SyncStatus>(sync.status());
  const [url, setUrl] = useState(sync.url ?? 'http://localhost:8090');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => sync.subscribe(setStatus), []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sync.connect(url, email, password);
      setPassword('');
    } catch {
      // Status already set by controller; nothing to do.
    }
  };

  const handleSync = async () => {
    try {
      await sync.syncNow();
    } catch {
      /* status set by controller */
    }
  };

  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-3 text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Sync</div>
        <div className="text-sm font-semibold text-slate-100">PocketBase</div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Self-hosted backup & cross-device sync. See <span className="font-mono">docs/SYNC.md</span>
          {' '}for the server setup.
        </div>
      </div>

      {!status.connected ? (
        <form onSubmit={handleConnect} className="space-y-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Server URL</span>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://pb.example.com"
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </label>
          <button
            type="submit"
            disabled={status.busy}
            className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded py-1.5 font-semibold text-white"
          >
            {status.busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Connected</div>
            <div className="text-slate-200 break-all">{status.authedAs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 break-all">{status.url}</div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Last sync</div>
            <div className="text-slate-200">{fmtAgo(status.lastSyncAt)}</div>
          </div>
          <button
            onClick={handleSync}
            disabled={status.busy}
            className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded py-1.5 font-semibold text-white"
          >
            {status.busy ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            onClick={() => sync.disconnect()}
            className="w-full text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded py-1.5"
          >
            Disconnect
          </button>
        </div>
      )}

      {status.lastMessage && (
        <div className="px-2 py-1 rounded bg-slate-900/50 border border-slate-800 text-slate-400 text-[10px]">
          {status.lastMessage}
        </div>
      )}
      {status.lastError && (
        <div className="px-2 py-1 rounded bg-rose-950/40 border border-rose-900 text-rose-200 text-[10px]">
          {status.lastError}
        </div>
      )}
    </div>
  );
}
