import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, HardDrive } from 'lucide-react';
import { storageProviderApi, type StorageProviderConfig, type GenericTestLog } from '../../api/services/genericProviders';
import GenericProviderCard, { type ProviderMeta } from './GenericProviderCard';
import StorageProviderDrawer from './StorageProviderDrawer';

const STORAGE_META: ProviderMeta = {
  supabase_storage: { label: 'Supabase Storage', color: 'text-emerald-400', bg: 'bg-emerald-500/10', abbr: 'SB' },
  s3:               { label: 'AWS S3',           color: 'text-amber-400',   bg: 'bg-amber-500/10',   abbr: 'S3' },
  local:            { label: 'Local',            color: 'text-slate-400',   bg: 'bg-slate-500/10',   abbr: 'LC' },
  stub:             { label: 'Stub',             color: 'text-slate-400',   bg: 'bg-slate-500/10',   abbr: 'ST' },
  custom:           { label: 'Custom',           color: 'text-slate-400',   bg: 'bg-slate-500/10',   abbr: 'CU' },
};

interface Props { adminEmail: string; adminRole?: string; }

export default function StorageManagementPanel({ adminEmail, adminRole = 'VIEWER' }: Props) {
  const [providers, setProviders] = useState<StorageProviderConfig[]>([]);
  const [logMap, setLogMap]       = useState<Record<string, GenericTestLog>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<StorageProviderConfig | null>(null);
  const [showNew, setShowNew]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const provs = await storageProviderApi.list();
      setProviders(provs);
      const map: Record<string, GenericTestLog> = {};
      await Promise.all(provs.map(async (p) => {
        const logs = await storageProviderApi.getTestLogs(p.id);
        if (logs.length > 0) map[p.id] = logs[0];
      }));
      setLogMap(map);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(p: StorageProviderConfig) {
    setProviders((prev) => { const i = prev.findIndex((x) => x.id === p.id); if (i >= 0) { const u = [...prev]; u[i] = p; return u; } return [p, ...prev]; });
    setSelected(p); setShowNew(false);
  }
  function handleDeleted(id: string) { setProviders((prev) => prev.filter((p) => p.id !== id)); setSelected(null); }

  const primary = providers.find((p) => p.is_primary);
  const liveGroup = providers.filter((p) => p.environment_mode === 'LIVE');
  const sandboxGroup = providers.filter((p) => p.environment_mode === 'SANDBOX');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">Storage Provider Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure object storage for reports, uploads, and generated files.</p>
        </div>
        <button onClick={load} disabled={loading} className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!loading && providers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"><p className="text-xl font-bold text-slate-300">{providers.length}</p><p className="text-xs text-slate-600 mt-0.5">Total</p></div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"><p className="text-xl font-bold text-emerald-400">{providers.filter((p) => p.is_active).length}</p><p className="text-xs text-slate-600 mt-0.5">Active</p></div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">{primary ? <><p className="text-sm font-semibold text-amber-400 truncate">{primary.provider_name}</p><p className="text-xs text-slate-600 mt-0.5">Primary</p></> : <p className="text-sm text-slate-600">No primary set</p>}</div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-14"><div className="w-6 h-6 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" /></div>}
      {!loading && error && <div className="flex flex-col items-center py-10 gap-3"><AlertTriangle className="w-7 h-7 text-red-400/50" /><p className="text-sm text-red-400">{error}</p><button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors">Retry</button></div>}

      {!loading && !error && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 text-xs text-white bg-slate-600 hover:bg-slate-500 rounded-lg px-3 py-1.5 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Provider
            </button>
          </div>
          {providers.length === 0 ? (
            <div className="text-center py-14 text-slate-600"><HardDrive className="w-9 h-9 mx-auto mb-3 opacity-25" /><p className="text-sm">No storage providers configured.</p><p className="text-xs mt-1">Supabase Storage is the default. Add S3 for production scale.</p><button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add provider</button></div>
          ) : (
            <div className="space-y-6">
              {liveGroup.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-red-400" /><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Live</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {liveGroup.map((p) => <GenericProviderCard key={p.id} provider={p} meta={STORAGE_META} latestLog={logMap[p.id] ?? null} subtitle={p.bucket_name ?? undefined} onClick={() => setSelected(p)} />)}
                  </div>
                </div>
              )}
              {sandboxGroup.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-slate-500" /><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sandbox / Test</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sandboxGroup.map((p) => <GenericProviderCard key={p.id} provider={p} meta={STORAGE_META} latestLog={logMap[p.id] ?? null} subtitle={p.bucket_name ?? undefined} onClick={() => setSelected(p)} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selected && <StorageProviderDrawer provider={selected} isNew={false} adminEmail={adminEmail} onClose={() => setSelected(null)} onSaved={handleSaved} onDeleted={handleDeleted} />}
      {showNew && <StorageProviderDrawer provider={null} isNew={true} adminEmail={adminEmail} onClose={() => setShowNew(false)} onSaved={handleSaved} onDeleted={() => {}} />}
    </div>
  );
}
