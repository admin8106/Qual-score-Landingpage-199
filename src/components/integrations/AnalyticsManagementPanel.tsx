import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, BarChart2 } from 'lucide-react';
import { analyticsProviderConfigApi, type AnalyticsProviderConfig, type GenericTestLog } from '../../api/services/genericProviders';
import GenericProviderCard, { type ProviderMeta } from './GenericProviderCard';
import AnalyticsProviderDrawer from './AnalyticsProviderDrawer';

const ANALYTICS_META: ProviderMeta = {
  ga4:        { label: 'Google Analytics 4', color: 'text-orange-400', bg: 'bg-orange-500/10', abbr: 'GA' },
  meta_pixel: { label: 'Meta Pixel / CAPI',  color: 'text-blue-400',   bg: 'bg-blue-500/10',   abbr: 'FB' },
  mixpanel:   { label: 'Mixpanel',           color: 'text-violet-400', bg: 'bg-violet-500/10', abbr: 'MX' },
  stub:       { label: 'Stub',               color: 'text-slate-400',  bg: 'bg-slate-500/10',  abbr: 'SB' },
  custom:     { label: 'Custom',             color: 'text-slate-400',  bg: 'bg-slate-500/10',  abbr: 'CU' },
};

interface Props { adminEmail: string; adminRole?: string; }

export default function AnalyticsManagementPanel({ adminEmail, adminRole = 'VIEWER' }: Props) {
  const [providers, setProviders] = useState<AnalyticsProviderConfig[]>([]);
  const [logMap, setLogMap]       = useState<Record<string, GenericTestLog>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<AnalyticsProviderConfig | null>(null);
  const [showNew, setShowNew]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const provs = await analyticsProviderConfigApi.list();
      setProviders(provs);
      const map: Record<string, GenericTestLog> = {};
      await Promise.all(provs.map(async (p) => {
        const logs = await analyticsProviderConfigApi.getTestLogs(p.id);
        if (logs.length > 0) map[p.id] = logs[0];
      }));
      setLogMap(map);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(p: AnalyticsProviderConfig) {
    setProviders((prev) => { const i = prev.findIndex((x) => x.id === p.id); if (i >= 0) { const u = [...prev]; u[i] = p; return u; } return [p, ...prev]; });
    setSelected(p); setShowNew(false);
  }
  function handleDeleted(id: string) { setProviders((prev) => prev.filter((p) => p.id !== id)); setSelected(null); }

  const activeCount = providers.filter((p) => p.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">Analytics Provider Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">All active providers fire simultaneously for each tracked event. There is no primary/fallback for analytics.</p>
        </div>
        <button onClick={load} disabled={loading} className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!loading && providers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"><p className="text-xl font-bold text-slate-300">{providers.length}</p><p className="text-xs text-slate-600 mt-0.5">Total</p></div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"><p className="text-xl font-bold text-emerald-400">{activeCount}</p><p className="text-xs text-slate-600 mt-0.5">Active (all fire)</p></div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"><p className="text-xl font-bold text-slate-300">{providers.length - activeCount}</p><p className="text-xs text-slate-600 mt-0.5">Inactive</p></div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-14"><div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>}
      {!loading && error && <div className="flex flex-col items-center py-10 gap-3"><AlertTriangle className="w-7 h-7 text-red-400/50" /><p className="text-sm text-red-400">{error}</p><button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors">Retry</button></div>}

      {!loading && !error && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 text-xs text-white bg-orange-700 hover:bg-orange-600 rounded-lg px-3 py-1.5 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Provider
            </button>
          </div>
          {providers.length === 0 ? (
            <div className="text-center py-14 text-slate-600"><BarChart2 className="w-9 h-9 mx-auto mb-3 opacity-25" /><p className="text-sm">No analytics providers configured.</p><p className="text-xs mt-1">Add GA4, Meta Pixel, or Mixpanel to start tracking events.</p><button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add provider</button></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {providers.map((p) => (
                <GenericProviderCard key={p.id} provider={p} meta={ANALYTICS_META} latestLog={logMap[p.id] ?? null} hidePrimaryBadge onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </>
      )}

      {selected && <AnalyticsProviderDrawer provider={selected} isNew={false} adminEmail={adminEmail} onClose={() => setSelected(null)} onSaved={handleSaved} onDeleted={handleDeleted} />}
      {showNew && <AnalyticsProviderDrawer provider={null} isNew={true} adminEmail={adminEmail} onClose={() => setShowNew(false)} onSaved={handleSaved} onDeleted={() => {}} />}
    </div>
  );
}
