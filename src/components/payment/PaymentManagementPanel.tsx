import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, Star, CreditCard } from 'lucide-react';
import {
  paymentProviderApi,
  type PaymentProviderConfig,
  type PaymentTestLog,
} from '../../api/services/paymentProviders';
import PaymentProviderCard from './PaymentProviderCard';
import PaymentProviderDrawer from './PaymentProviderDrawer';

interface Props {
  adminEmail: string;
  adminRole?: string;
  appBaseUrl: string;
}

export default function PaymentManagementPanel({ adminEmail, adminRole = 'VIEWER', appBaseUrl }: Props) {
  const [providers, setProviders]       = useState<PaymentProviderConfig[]>([]);
  const [testLogMap, setTestLogMap]     = useState<Record<string, PaymentTestLog>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selected, setSelected]         = useState<PaymentProviderConfig | null>(null);
  const [showNew, setShowNew]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const provs = await paymentProviderApi.listProviders();
      setProviders(provs);

      const logMap: Record<string, PaymentTestLog> = {};
      await Promise.all(
        provs.map(async (p) => {
          const logs = await paymentProviderApi.getTestLogs(p.id);
          if (logs.length > 0) logMap[p.id] = logs[0];
        })
      );
      setTestLogMap(logMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment providers.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(p: PaymentProviderConfig) {
    setProviders((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = p;
        return updated;
      }
      return [p, ...prev];
    });
    setSelected(p);
    setShowNew(false);
  }

  function handleDeleted(id: string) {
    setProviders((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
  }

  const primaryProvider = providers.find((p) => p.is_primary);
  const activeCount = providers.filter((p) => p.is_active).length;
  const liveCount = providers.filter((p) => p.environment_mode === 'LIVE').length;

  const sandboxGroup = providers.filter((p) => p.environment_mode === 'SANDBOX');
  const liveGroup = providers.filter((p) => p.environment_mode === 'LIVE');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">Payment Gateway Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure payment providers, switch environments, and manage webhook credentials without code changes.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      {!loading && providers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-xl font-bold text-slate-300">{providers.length}</p>
            <p className="text-xs text-slate-600 mt-0.5">Total Providers</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-xl font-bold text-emerald-400">{activeCount}</p>
            <p className="text-xs text-slate-600 mt-0.5">Active</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            {primaryProvider ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <p className="text-sm font-semibold text-amber-400 truncate">{primaryProvider.provider_name}</p>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{primaryProvider.environment_mode}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600">No primary</p>
                <p className="text-xs text-slate-700 mt-0.5">Set a provider as primary</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center py-10 gap-3">
          <AlertTriangle className="w-7 h-7 text-red-400/50" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Providers */}
      {!loading && !error && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Provider
            </button>
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-14 text-slate-600">
              <CreditCard className="w-9 h-9 mx-auto mb-3 opacity-25" />
              <p className="text-sm">No payment providers configured yet.</p>
              <p className="text-xs mt-1">Add PayU or Razorpay to start accepting payments.</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-4 inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add provider
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {liveGroup.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Live / Production</p>
                    <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                      {liveCount} provider{liveCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {liveGroup.map((p) => (
                      <PaymentProviderCard
                        key={p.id}
                        provider={p}
                        latestLog={testLogMap[p.id] ?? null}
                        onClick={() => setSelected(p)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sandboxGroup.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sandbox / Test</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sandboxGroup.map((p) => (
                      <PaymentProviderCard
                        key={p.id}
                        provider={p}
                        latestLog={testLogMap[p.id] ?? null}
                        onClick={() => setSelected(p)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Provider drawer */}
      {selected && (
        <PaymentProviderDrawer
          provider={selected}
          isNew={false}
          adminEmail={adminEmail}
          appBaseUrl={appBaseUrl}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {showNew && (
        <PaymentProviderDrawer
          provider={null}
          isNew={true}
          adminEmail={adminEmail}
          appBaseUrl={appBaseUrl}
          onClose={() => setShowNew(false)}
          onSaved={handleSaved}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}
