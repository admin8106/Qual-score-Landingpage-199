import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle,
  CheckCircle, XCircle, Cpu, CreditCard, MessageCircle, Mail,
  Users, BarChart2, HardDrive, Calendar, Activity, Shield,
  Clock, ChevronDown, ChevronUp, Zap, GitBranch, Star, Info,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getPermissions } from '../context/AdminPermissions';
import { ROUTES } from '../constants/routes';
import {
  featureFlagsApi,
  type FeatureFlag,
  type FlagsByCategory,
  FLAG_CATEGORY_LABELS,
} from '../api/services/featureFlags';
import {
  providerResolutionApi,
  type CategoryProviderSnapshot,
  type ProviderCategory,
} from '../api/services/providerResolution';
import type { ResolutionLogEntry } from '../api/services/providerResolution';

// ─── Category icons ───────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  ai:         Cpu,
  payments:   CreditCard,
  whatsapp:   MessageCircle,
  email:      Mail,
  crm:        Users,
  analytics:  BarChart2,
  storage:    HardDrive,
  scheduling: Calendar,
  general:    Zap,
};

const CAT_COLOR: Record<string, string> = {
  ai:         'text-sky-400 bg-sky-500/10 border-sky-500/20',
  payments:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  whatsapp:   'text-green-400 bg-green-500/10 border-green-500/20',
  email:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  crm:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  analytics:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  storage:    'text-slate-400 bg-slate-500/10 border-slate-500/20',
  scheduling: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  general:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

// ─── Toggle with warning ──────────────────────────────────────────────────────

interface FlagRowProps {
  flag: FeatureFlag;
  onToggle: (flag: FeatureFlag, newVal: boolean) => void;
  toggling: boolean;
  canManage: boolean;
}

function FlagRow({ flag, onToggle, toggling, canManage }: FlagRowProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingVal, setPendingVal] = useState<boolean | null>(null);

  function handleClick() {
    const newVal = !flag.is_enabled;
    if (flag.is_critical && newVal === false) {
      setPendingVal(newVal);
      setShowWarning(true);
    } else {
      onToggle(flag, newVal);
    }
  }

  function confirmToggle() {
    if (pendingVal !== null) onToggle(flag, pendingVal);
    setShowWarning(false);
    setPendingVal(null);
  }

  return (
    <>
      <div className="flex items-start gap-3 py-3 border-b border-white/[0.05] last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">{flag.flag_label}</span>
            {flag.is_critical && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                <Shield className="w-2.5 h-2.5" /> Critical
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{flag.flag_description}</p>
          {flag.last_changed_at && (
            <p className="text-xs text-slate-700 mt-1">
              Last changed {new Date(flag.last_changed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {flag.last_changed_by_email ? ` by ${flag.last_changed_by_email}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <span className={`text-xs font-medium ${flag.is_enabled ? 'text-emerald-400' : 'text-slate-600'}`}>
            {flag.is_enabled ? 'ON' : 'OFF'}
          </span>
          {canManage ? (
            <button
              onClick={handleClick}
              disabled={toggling}
              className={`relative inline-flex items-center rounded-full transition-all duration-200 disabled:opacity-40 w-10 h-5 ${
                flag.is_enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              title={flag.is_enabled ? 'Click to disable' : 'Click to enable'}
            >
              <span
                className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${
                  flag.is_enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <span
              className={`relative inline-flex items-center rounded-full w-10 h-5 cursor-not-allowed opacity-40 ${
                flag.is_enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              title="You do not have permission to toggle flags"
            >
              <span
                className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow ${
                  flag.is_enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </span>
          )}
        </div>
      </div>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0D1120] border border-amber-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Disable Critical Flag?</p>
                <p className="text-xs text-slate-500 mt-0.5">{flag.flag_label}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              This is a <span className="text-amber-400 font-semibold">mission-critical integration flag</span>. Disabling it will interrupt live system behavior. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowWarning(false); setPendingVal(null); }}
                className="flex-1 text-sm text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                className="flex-1 text-sm text-white bg-amber-600 hover:bg-amber-500 rounded-xl px-4 py-2.5 transition-colors font-medium"
              >
                Disable Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

interface FlagCatSectionProps {
  group: FlagsByCategory;
  onToggle: (flag: FeatureFlag, val: boolean) => void;
  togglingKey: string | null;
  canManage: boolean;
}

function FlagCatSection({ group, onToggle, togglingKey, canManage }: FlagCatSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = CAT_ICON[group.category] ?? Zap;
  const colorClass = CAT_COLOR[group.category] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  const enabledCount = group.flags.filter((f) => f.is_enabled).length;

  return (
    <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">{group.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {enabledCount} of {group.flags.length} flags enabled
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {group.flags.map((f) => (
              <span
                key={f.flag_key}
                className={`w-1.5 h-1.5 rounded-full ${f.is_enabled ? 'bg-emerald-400' : 'bg-slate-700'}`}
                title={f.flag_label}
              />
            ))}
          </div>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-600" />
            : <ChevronUp className="w-4 h-4 text-slate-600" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="px-5 pb-2 border-t border-white/[0.05]">
          {group.flags.map((f) => (
            <FlagRow
              key={f.flag_key}
              flag={f}
              onToggle={onToggle}
              toggling={togglingKey === f.flag_key}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Provider snapshot card ───────────────────────────────────────────────────

function ProviderSnapshotCard({ snap }: { snap: CategoryProviderSnapshot }) {
  const Icon = CAT_ICON[snap.category] ?? Zap;
  const colorClass = CAT_COLOR[snap.category] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  const coveragePill = snap.hasNoProvider
    ? { label: 'No provider', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
    : snap.primaryProvider && snap.fallbackProvider
    ? { label: 'Primary + Fallback', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : snap.primaryProvider
    ? { label: 'Primary only', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    : { label: 'Fallback only', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };

  return (
    <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm font-semibold text-white">{snap.label}</p>
      </div>
      <div className="mb-3">
        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${coveragePill.cls}`}>
          {coveragePill.label}
        </span>
      </div>

      {snap.hasNoProvider ? (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          No active provider
        </div>
      ) : (
        <div className="space-y-2">
          {snap.primaryProvider ? (
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-300 truncate">{snap.primaryProvider.providerName}</p>
                <p className="text-xs text-slate-600 font-mono truncate">{snap.primaryProvider.providerCode}</p>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5 shrink-0">Primary</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3 shrink-0" /> No primary set
            </div>
          )}
          {snap.fallbackProvider && (
            <div className="flex items-center gap-2">
              <GitBranch className="w-3 h-3 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400 truncate">{snap.fallbackProvider.providerName}</p>
                <p className="text-xs text-slate-600 font-mono truncate">{snap.fallbackProvider.providerCode}</p>
              </div>
              <span className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-1.5 py-0.5 shrink-0">Fallback</span>
            </div>
          )}
          <p className="text-xs text-slate-600">{snap.allActiveCount} active provider{snap.allActiveCount !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

// ─── Resolution log row ───────────────────────────────────────────────────────

function ResolutionLogRow({ log }: { log: ResolutionLogEntry }) {
  const isOk = log.resolution_status === 'RESOLVED';
  const isFallback = log.was_fallback;
  const isNone = log.resolution_status === 'NO_PROVIDER';

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0`}>
      <div className="mt-0.5 shrink-0">
        {isNone
          ? <XCircle className="w-3.5 h-3.5 text-red-400" />
          : isFallback
          ? <GitBranch className="w-3.5 h-3.5 text-amber-400" />
          : isOk
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          : <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-300 uppercase">{log.category}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500 font-mono">{log.environment_mode}</span>
          {log.resolved_provider_code && (
            <>
              <span className="text-xs text-slate-600">→</span>
              <span className="text-xs text-slate-400 font-mono">{log.resolved_provider_code}</span>
            </>
          )}
          {isFallback && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">fallback</span>
          )}
          {isNone && (
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-1.5 py-0.5">no provider</span>
          )}
        </div>
        {log.resolution_reason && (
          <p className="text-xs text-slate-600 mt-0.5 truncate">{log.resolution_reason}</p>
        )}
        {log.trigger_context && (
          <p className="text-xs text-slate-700 truncate">{log.trigger_context}</p>
        )}
      </div>
      <span className="text-xs text-slate-700 shrink-0">
        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'flags' | 'routing' | 'logs';

export default function FeatureFlagsPage() {
  const navigate = useNavigate();
  const { profile, permissions } = useAdminAuth();
  const canManage = permissions.canManageFeatureFlags;

  const [tab, setTab] = useState<Tab>('flags');
  const [flagGroups, setFlagGroups] = useState<FlagsByCategory[]>([]);
  const [snapshots, setSnapshots] = useState<CategoryProviderSnapshot[]>([]);
  const [resolutionLogs, setResolutionLogs] = useState<ResolutionLogEntry[]>([]);
  const [logStats, setLogStats] = useState<{
    total: number; resolved: number; fallback: number; noProvider: number;
    byCategory: Record<string, { total: number; fallback: number; noProvider: number }>;
  } | null>(null);
  const [envMode, setEnvMode] = useState<'SANDBOX' | 'LIVE'>('SANDBOX');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const adminEmail = profile?.email ?? 'admin';

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const groups = await featureFlagsApi.listByCategory();
      setFlagGroups(groups);
    } catch {
      setError('Failed to load feature flags.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRouting = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [snaps, stats] = await Promise.all([
        providerResolutionApi.getCategorySnapshot(envMode),
        providerResolutionApi.getStats(),
      ]);
      setSnapshots(snaps);
      setLogStats(stats);
    } catch {
      setError('Failed to load routing data.');
    } finally {
      setLoading(false);
    }
  }, [envMode]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const logs = await providerResolutionApi.getLogs({ limit: 200 });
      setResolutionLogs(logs);
    } catch {
      setError('Failed to load resolution logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'flags') loadFlags();
    else if (tab === 'routing') loadRouting();
    else if (tab === 'logs') loadLogs();
  }, [tab, loadFlags, loadRouting, loadLogs]);

  useEffect(() => {
    if (tab === 'routing') loadRouting();
  }, [envMode, tab, loadRouting]);

  async function handleToggle(flag: FeatureFlag, newVal: boolean) {
    setTogglingKey(flag.flag_key);
    try {
      const updated = await featureFlagsApi.toggle(flag.flag_key, newVal, adminEmail);
      setFlagGroups((prev) =>
        prev.map((g) => ({
          ...g,
          flags: g.flags.map((f) => (f.flag_key === updated.flag_key ? updated : f)),
        }))
      );
      showToast(`${updated.flag_label} is now ${updated.is_enabled ? 'ON' : 'OFF'}`);
    } catch {
      showToast('Failed to update flag.');
    } finally {
      setTogglingKey(null);
    }
  }

  const totalFlags = flagGroups.reduce((s, g) => s + g.flags.length, 0);
  const enabledFlags = flagGroups.reduce((s, g) => s + g.flags.filter((f) => f.is_enabled).length, 0);
  const criticalDisabled = flagGroups
    .flatMap((g) => g.flags)
    .filter((f) => f.is_critical && !f.is_enabled);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'flags',   label: 'Feature Flags',   icon: ToggleRight },
    { key: 'routing', label: 'Provider Routing', icon: GitBranch },
    { key: 'logs',    label: 'Resolution Logs',  icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.ADMIN_INTEGRATIONS)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="text-sm font-semibold text-white hidden sm:inline">Integration Flags & Routing</span>

            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 ml-2">
              {TABS.map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition-colors ${
                      tab === t.key
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <TIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'routing' && (
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
                {(['SANDBOX', 'LIVE'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEnvMode(mode)}
                    className={`text-xs px-3 py-1 rounded-md transition-colors ${
                      envMode === mode
                        ? mode === 'LIVE'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/[0.08] text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                if (tab === 'flags') loadFlags();
                else if (tab === 'routing') loadRouting();
                else loadLogs();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">

        {/* Critical disabled warning banner */}
        {tab === 'flags' && criticalDisabled.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Critical Flags Disabled</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {criticalDisabled.map((f) => f.flag_label).join(', ')} — re-enable to restore mission-critical behavior.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <button
              onClick={() => {
                if (tab === 'flags') loadFlags();
                else if (tab === 'routing') loadRouting();
                else loadLogs();
              }}
              className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.10] rounded-lg px-3 py-1.5 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── FEATURE FLAGS TAB ─────────────────────────────────────────────── */}
        {!loading && !error && tab === 'flags' && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
              {[
                { label: 'Total Flags',        value: totalFlags,    color: 'text-slate-300',   Icon: ToggleLeft },
                { label: 'Enabled',            value: enabledFlags,  color: 'text-emerald-400', Icon: CheckCircle },
                { label: 'Disabled',           value: totalFlags - enabledFlags, color: totalFlags - enabledFlags > 0 ? 'text-slate-400' : 'text-slate-600', Icon: ToggleRight },
                { label: 'Critical Disabled',  value: criticalDisabled.length, color: criticalDisabled.length > 0 ? 'text-amber-400' : 'text-slate-600', Icon: Shield },
              ].map((item) => (
                <div key={item.label} className="bg-white/[0.02] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
                  <item.Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <div>
                    <p className={`text-xl font-bold leading-none ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 bg-white/[0.02] border border-white/[0.07] rounded-xl px-4 py-3">
              <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              Feature flags control which integrations are active at runtime. Changes take effect immediately. Critical flags will show a confirmation dialog before disabling.
            </div>

            {!canManage && (
              <div className="flex items-center gap-2 bg-slate-500/8 border border-white/[0.06] rounded-xl px-3 py-2 mb-4">
                <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <p className="text-xs text-slate-500">You have view-only access. Contact a Super Admin or Admin to modify feature flags.</p>
              </div>
            )}

            <div className="space-y-3">
              {flagGroups.map((group) => (
                <FlagCatSection
                  key={group.category}
                  group={group}
                  onToggle={handleToggle}
                  togglingKey={togglingKey}
                  canManage={canManage}
                />
              ))}
            </div>
          </>
        )}

        {/* ─── PROVIDER ROUTING TAB ──────────────────────────────────────────── */}
        {!loading && !error && tab === 'routing' && (
          <>
            {/* Stats row */}
            {logStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                {[
                  { label: 'Total (7d)',       value: logStats.total,                          color: 'text-slate-300',   Icon: Activity,    sub: 'provider resolutions logged' },
                  { label: 'Via Primary',      value: logStats.resolved - logStats.fallback,   color: 'text-emerald-400', Icon: CheckCircle, sub: 'primary provider used' },
                  { label: 'Via Fallback',     value: logStats.fallback,                       color: logStats.fallback > 0 ? 'text-amber-400' : 'text-slate-600', Icon: GitBranch, sub: 'fallback provider used' },
                  { label: 'No Provider',      value: logStats.noProvider,                     color: logStats.noProvider > 0 ? 'text-red-400' : 'text-slate-600', Icon: XCircle, sub: 'resolution failed' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.02] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
                    <item.Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                    <div>
                      <p className={`text-xl font-bold leading-none ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                      {'sub' in item && <p className="text-xs text-slate-700">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-sm font-semibold text-white mb-1">
                Active Provider Snapshot — <span className={envMode === 'LIVE' ? 'text-red-400' : 'text-slate-400'}>{envMode}</span>
              </h2>
              <p className="text-xs text-slate-500">Shows which provider would be selected at runtime for each category in this environment.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
              {snapshots.map((snap) => (
                <ProviderSnapshotCard key={snap.category} snap={snap} />
              ))}
            </div>

            {/* Per-category 7d stats */}
            {logStats && Object.keys(logStats.byCategory).length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-white mb-3">7-Day Resolution Activity by Category</h2>
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-slate-500 font-medium">Total</th>
                        <th className="text-right px-4 py-3 text-amber-400/70 font-medium">Fallback</th>
                        <th className="text-right px-4 py-3 text-red-400/70 font-medium">No Provider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(logStats.byCategory).map(([cat, s]) => {
                        const Icon = CAT_ICON[cat] ?? Zap;
                        const colorClass = CAT_COLOR[cat] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                        const total = s?.total ?? 0;
                        const fallback = s?.fallback ?? 0;
                        const noProvider = s?.noProvider ?? 0;
                        return (
                          <tr key={cat} className="border-b border-white/[0.04] last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${colorClass}`}>
                                  <Icon className="w-3 h-3" />
                                </div>
                                <span className="text-slate-300 font-medium">{FLAG_CATEGORY_LABELS[cat] ?? cat}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400">{total}</td>
                            <td className={`px-4 py-3 text-right ${fallback > 0 ? 'text-amber-400' : 'text-slate-700'}`}>
                              {fallback}
                            </td>
                            <td className={`px-4 py-3 text-right ${noProvider > 0 ? 'text-red-400' : 'text-slate-700'}`}>
                              {noProvider}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {logStats && Object.keys(logStats.byCategory).length === 0 && (
              <div className="text-center py-16 text-slate-600">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No resolution activity in the last 7 days.</p>
                <p className="text-xs mt-1">Activity will appear here once providers are resolved at runtime.</p>
              </div>
            )}
          </>
        )}

        {/* ─── RESOLUTION LOGS TAB ───────────────────────────────────────────── */}
        {!loading && !error && tab === 'logs' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white">Provider Resolution Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every runtime provider selection is recorded here — including fallbacks and failures.
                </p>
              </div>
              <span className="text-xs text-slate-600">{resolutionLogs.length} entries</span>
            </div>

            {resolutionLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No resolution logs yet.</p>
                <p className="text-xs mt-1">Logs appear when the system selects a provider at runtime.</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl px-5 py-2">
                {resolutionLogs.map((log) => (
                  <ResolutionLogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0D1120] border border-white/[0.12] text-white text-sm px-5 py-3 rounded-xl shadow-2xl animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
