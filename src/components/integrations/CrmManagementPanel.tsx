import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { crmProviderApi, type CrmProviderConfig, type GenericTestLog } from '../../api/services/genericProviders';
import GenericProviderCard, { type ProviderMeta } from './GenericProviderCard';
import CrmProviderDrawer from './CrmProviderDrawer';

const CRM_META: ProviderMeta = {
  zoho:      { label: 'Zoho CRM',         color: 'text-red-400',    bg: 'bg-red-500/10',    abbr: 'ZO' },
  hubspot:   { label: 'HubSpot',          color: 'text-amber-400',  bg: 'bg-amber-500/10',  abbr: 'HS' },
  salesforce:{ label: 'Salesforce',       color: 'text-blue-400',   bg: 'bg-blue-500/10',   abbr: 'SF' },
  webhook:   { label: 'Webhook CRM',      color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   abbr: 'WH' },
  stub:      { label: 'Stub',             color: 'text-slate-400',  bg: 'bg-slate-500/10',  abbr: 'SB' },
  custom:    { label: 'Custom',           color: 'text-slate-400',  bg: 'bg-slate-500/10',  abbr: 'CU' },
};

interface Props { adminEmail: string; adminRole?: string; }

export default function CrmManagementPanel({ adminEmail, adminRole = 'VIEWER' }: Props) {
  const [providers, setProviders] = useState<CrmProviderConfig[]>([]);
  const [logMap, setLogMap]       = useState<Record<string, GenericTestLog>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<CrmProviderConfig | null>(null);
  const [showNew, setShowNew]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const provs = await crmProviderApi.list();
      setProviders(provs);
      const map: Record<string, GenericTestLog> = {};
      await Promise.all(provs.map(async (p) => {
        const logs = await crmProviderApi.getTestLogs(p.id);
        if (logs.length > 0) map[p.id] = logs[0];
      }));
      setLogMap(map);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(p: CrmProviderConfig) {
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
          <h2 className="text-base font-semibold text-white">CRM Provider Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure CRM integrations for lead sync, deal tracking, and automation.</p>
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

      {loading && <div className="flex items-center justify-center py-14"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>}
      {!loading && error && <div className="flex flex-col items-center py-10 gap-3"><AlertTriangle className="w-7 h-7 text-red-400/50" /><p className="text-sm text-red-400">{error}</p><button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors">Retry</button></div>}

      {!loading && !error && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 text-xs text-white bg-amber-700 hover:bg-amber-600 rounded-lg px-3 py-1.5 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Provider
            </button>
          </div>
          {providers.length === 0 ? (
            <div className="text-center py-14 text-slate-600"><Users className="w-9 h-9 mx-auto mb-3 opacity-25" /><p className="text-sm">No CRM providers configured.</p><p className="text-xs mt-1">Add Zoho, HubSpot, Salesforce, or a generic Webhook CRM.</p><button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"><Plus className="w-3.5 h-3.5" /> Add provider</button></div>
          ) : (
            <div className="space-y-6">
              {liveGroup.length > 0 && <GroupSection label="Live" dot="bg-red-400" providers={liveGroup} meta={CRM_META} logMap={logMap} onSelect={setSelected} />}
              {sandboxGroup.length > 0 && <GroupSection label="Sandbox / Test" dot="bg-slate-500" providers={sandboxGroup} meta={CRM_META} logMap={logMap} onSelect={setSelected} />}
            </div>
          )}
        </>
      )}

      {selected && <CrmProviderDrawer provider={selected} isNew={false} adminEmail={adminEmail} onClose={() => setSelected(null)} onSaved={handleSaved} onDeleted={handleDeleted} />}
      {showNew && <CrmProviderDrawer provider={null} isNew={true} adminEmail={adminEmail} onClose={() => setShowNew(false)} onSaved={handleSaved} onDeleted={() => {}} />}
    </div>
  );
}

function GroupSection({ label, dot, providers, meta, logMap, onSelect }: {
  label: string; dot: string; providers: CrmProviderConfig[]; meta: ProviderMeta;
  logMap: Record<string, GenericTestLog>; onSelect: (p: CrmProviderConfig) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><span className={`w-2 h-2 rounded-full ${dot}`} /><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {providers.map((p) => (
          <GenericProviderCard key={p.id} provider={p} meta={meta} latestLog={logMap[p.id] ?? null} onClick={() => onSelect(p)} />
        ))}
      </div>
    </div>
  );
}
