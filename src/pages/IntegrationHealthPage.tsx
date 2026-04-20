import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  AlertCircle, Play, PlayCircle, Clock, ChevronDown, ChevronUp,
  Cpu, CreditCard, MessageCircle, Mail, Users, BarChart2,
  HardDrive, Calendar, Zap, Star, GitBranch, Search, Filter,
  Activity, Shield, Info, RotateCcw,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';
import {
  integrationHealthApi,
  type ProviderHealthRecord,
  type HealthTestResult,
  type HealthStatus,
  type HealthCategory,
} from '../api/services/integrationHealth';

// ─── Category metadata ────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  ai: Cpu, payments: CreditCard, whatsapp: MessageCircle,
  email: Mail, crm: Users, analytics: BarChart2,
  storage: HardDrive, scheduling: Calendar,
};

const CAT_LABEL: Record<string, string> = {
  ai: 'AI / LLM', payments: 'Payments', whatsapp: 'WhatsApp',
  email: 'Email', crm: 'CRM', analytics: 'Analytics',
  storage: 'Storage', scheduling: 'Scheduling',
};

const CAT_COLOR: Record<string, string> = {
  ai:         'text-sky-400 bg-sky-500/10 border-sky-500/20',
  payments:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  whatsapp:   'text-green-400 bg-green-500/10 border-green-500/20',
  email:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  crm:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  analytics:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  storage:    'text-slate-300 bg-slate-500/10 border-slate-500/20',
  scheduling: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const TEST_TYPE_LABEL: Record<string, string> = {
  PROMPT_CALL:       'AI Prompt Test',
  CONFIG_VALIDATION: 'Config Validation',
  TEST_SEND:         'Test Send',
  TEST_PUSH:         'Test Push',
  TEST_EVENT:        'Test Event',
  FILE_READ_WRITE:   'File Read/Write',
  CONNECTION_TEST:   'Connection Test',
};

// ─── Health status helpers ────────────────────────────────────────────────────

const HEALTH_META: Record<HealthStatus, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  healthy:        { label: 'Healthy',        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle },
  warning:        { label: 'Warning',        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: AlertTriangle },
  timeout:        { label: 'Timed Out',      color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: Clock },
  failed:         { label: 'Failed',         color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     Icon: XCircle },
  not_configured: { label: 'Not Configured', color: 'text-slate-500',   bg: 'bg-slate-500/10',   border: 'border-white/[0.06]',   Icon: AlertCircle },
};

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'Passed',
  FAILURE: 'Failed',
  TIMEOUT: 'Timed out',
};

type FilterKey = 'all' | HealthStatus;

// ─── Provider card ────────────────────────────────────────────────────────────

interface ProviderCardProps {
  record: ProviderHealthRecord;
  onRunTest: (record: ProviderHealthRecord) => void;
  running: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  history: HealthTestResult[];
  historyLoading: boolean;
}

function ProviderCard({
  record, onRunTest, running, expanded, onToggleExpand, history, historyLoading,
}: ProviderCardProps) {
  const CatIcon = CAT_ICON[record.category] ?? Zap;
  const catColor = CAT_COLOR[record.category] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  const hm = HEALTH_META[record.healthStatus];
  const HIcon = hm.Icon;

  const latest = record.latestTest;

  return (
    <div className={`bg-white/[0.02] border rounded-2xl overflow-hidden transition-all duration-150 ${
      record.healthStatus === 'failed' ? 'border-red-500/20' :
      record.healthStatus === 'healthy' ? 'border-emerald-500/15' :
      'border-white/[0.07]'
    }`}>
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${catColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-white">{record.providerName}</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${hm.bg} ${hm.color} ${hm.border}`}>
                <HIcon className="w-3 h-3" />
                {hm.label}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${catColor}`}>
                {CAT_LABEL[record.category]}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                record.isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-slate-600 bg-slate-500/10 border-white/[0.05]'
              }`}>
                {record.isActive ? 'Active' : 'Inactive'}
              </span>
              {record.isPrimary && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-400" /> Primary
                </span>
              )}
              {record.isFallback && (
                <span className="inline-flex items-center gap-1 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-1.5 py-0.5">
                  <GitBranch className="w-2.5 h-2.5" /> Fallback
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                record.environmentMode === 'LIVE'
                  ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : 'text-slate-500 bg-slate-500/10 border-white/[0.06]'
              }`}>
                {record.environmentMode}
              </span>
            </div>

            {/* Latest test summary */}
            <div className="mt-2 flex items-center gap-2">
              {latest ? (
                <>
                  {latest.status === 'SUCCESS'
                    ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    : latest.status === 'FAILURE'
                    ? <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                    : latest.status === 'TIMEOUT'
                    ? <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    : <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                  }
                  <span className="text-xs text-slate-500 truncate">{latest.response_summary}</span>
                  <span className="text-xs text-slate-700 shrink-0">
                    {new Date(latest.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-700">No tests run yet</span>
              )}
            </div>

            {latest?.error_detail && (
              <div className="mt-1.5 flex items-start gap-1.5 bg-red-500/8 border border-red-500/15 rounded-lg px-2.5 py-1.5">
                <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{latest.error_detail}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onRunTest(record)}
              disabled={running || !record.isActive}
              title={record.isActive ? `Run ${TEST_TYPE_LABEL[integrationHealthApi.PROVIDER_TABLES[record.category as HealthCategory].testType]}` : 'Provider inactive'}
              className="inline-flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              {running
                ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                : <Play className="w-3 h-3" />
              }
              <span className="hidden sm:inline">{running ? 'Testing…' : 'Test'}</span>
            </button>
            <button
              onClick={onToggleExpand}
              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: checks + history */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-4 space-y-4">

          {/* Latest test checks */}
          {latest?.checks_run && latest.checks_run.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Last Test — {TEST_TYPE_LABEL[latest.test_type] ?? latest.test_type}
                {latest.latency_ms ? <span className="ml-2 text-slate-600 normal-case">({latest.latency_ms}ms)</span> : null}
              </p>
              <div className="space-y-1.5">
                {latest.checks_run.map((check, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-3 py-2 rounded-xl border ${
                      check.passed
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : 'bg-red-500/5 border-red-500/15'
                    }`}
                  >
                    {check.passed
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    }
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${check.passed ? 'text-emerald-300' : 'text-red-300'}`}>{check.name}</p>
                      {check.detail && <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test history */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Test History</p>
            {historyLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 border border-slate-600 border-t-slate-400 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-700 py-3">No test history.</p>
            ) : (
              <div className="space-y-1.5">
                {history.slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-center gap-2.5 py-1.5">
                    {h.status === 'SUCCESS'
                      ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                      : h.status === 'FAILURE'
                      ? <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                      : <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                    }
                    <span className={`text-xs font-medium w-16 shrink-0 ${
                      h.status === 'SUCCESS' ? 'text-emerald-400' :
                      h.status === 'FAILURE' ? 'text-red-400' :
                      h.status === 'TIMEOUT' ? 'text-amber-400' : 'text-slate-600'
                    }`}>{STATUS_LABEL[h.status] ?? h.status}</span>
                    <span className="text-xs text-slate-600 truncate flex-1">{h.response_summary}</span>
                    <span className="text-xs text-slate-700 shrink-0">
                      {new Date(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IntegrationHealthPage() {
  const navigate = useNavigate();
  const { profile } = useAdminAuth();
  const adminEmail = profile?.email ?? 'admin';

  const [providers, setProviders] = useState<ProviderHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testHistories, setTestHistories] = useState<Record<string, HealthTestResult[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState('');
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await integrationHealthApi.listAllProviders();
      setProviders(data);
    } catch {
      setError('Failed to load providers. Check Supabase connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRunTest(record: ProviderHealthRecord) {
    setRunningId(record.id);
    try {
      const result = await integrationHealthApi.runTest(record.category as HealthCategory, record.id, adminEmail);
      setProviders((prev) =>
        prev.map((p) =>
          p.id === record.id
            ? {
                ...p,
                latestTest: result,
                healthStatus:
                  result.status === 'SUCCESS' ? 'healthy' :
                  result.status === 'FAILURE' ? 'failed' :
                  result.status === 'TIMEOUT' ? 'timeout' : 'warning',
              }
            : p
        )
      );
      if (expandedId === record.id) {
        setTestHistories((prev) => ({
          ...prev,
          [record.id]: [result, ...(prev[record.id] ?? [])].slice(0, 20),
        }));
      }
      showToast(`Test complete — ${result.status === 'SUCCESS' ? 'All checks passed' : 'Some checks failed'}`);
    } catch (e) {
      showToast(`Test failed: ${(e as Error).message}`);
    } finally {
      setRunningId(null);
    }
  }

  async function handleRunAll() {
    setRunningAll(true);
    setBulkErrors([]);
    try {
      const { results, errors } = await integrationHealthApi.runAllTests(adminEmail);
      if (errors.length) setBulkErrors(errors);
      setProviders((prev) =>
        prev.map((p) => {
          const r = results.find((res) => res.provider_id === p.id);
          if (!r) return p;
          return {
            ...p,
            latestTest: r,
            healthStatus:
              r.status === 'SUCCESS' ? 'healthy' :
              r.status === 'FAILURE' ? 'failed' :
              r.status === 'TIMEOUT' ? 'timeout' : 'warning',
          };
        })
      );
      showToast(`${results.length} tests complete`);
    } catch {
      showToast('Bulk test run failed.');
    } finally {
      setRunningAll(false);
    }
  }

  async function handleExpand(record: ProviderHealthRecord) {
    const isOpen = expandedId === record.id;
    setExpandedId(isOpen ? null : record.id);
    if (!isOpen && !testHistories[record.id]) {
      setHistoryLoading((prev) => ({ ...prev, [record.id]: true }));
      try {
        const hist = await integrationHealthApi.getProviderTestHistory(record.id);
        setTestHistories((prev) => ({ ...prev, [record.id]: hist }));
      } catch {
        // ignore
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [record.id]: false }));
      }
    }
  }

  // Summary counts
  const summary = {
    total: providers.length,
    healthy: providers.filter((p) => p.healthStatus === 'healthy').length,
    warning: providers.filter((p) => p.healthStatus === 'warning').length,
    timeout: providers.filter((p) => p.healthStatus === 'timeout').length,
    failed: providers.filter((p) => p.healthStatus === 'failed').length,
    notConfigured: providers.filter((p) => p.healthStatus === 'not_configured').length,
  };

  // Filtered list
  const filtered = providers.filter((p) => {
    if (filter !== 'all' && p.healthStatus !== filter) return false;
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.providerName.toLowerCase().includes(q) && !p.providerCode.toLowerCase().includes(q) && !p.category.includes(q)) return false;
    }
    return true;
  });

  const allCategories = [...new Set(providers.map((p) => p.category))];

  const FILTERS: { key: FilterKey; label: string; count: number; color: string }[] = [
    { key: 'all',            label: 'All',           count: summary.total,          color: 'text-slate-400' },
    { key: 'healthy',        label: 'Healthy',       count: summary.healthy,        color: 'text-emerald-400' },
    { key: 'warning',        label: 'Warning',       count: summary.warning,        color: 'text-amber-400' },
    { key: 'timeout',        label: 'Timed Out',     count: summary.timeout,        color: 'text-amber-400' },
    { key: 'failed',         label: 'Failed',        count: summary.failed,         color: 'text-red-400' },
    { key: 'not_configured', label: 'Inactive',      count: summary.notConfigured,  color: 'text-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(ROUTES.ADMIN_INTEGRATIONS)}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Integration Health & Test Center</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunAll}
              disabled={runningAll || loading}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              {runningAll
                ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                : <PlayCircle className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:inline">{runningAll ? 'Testing all…' : 'Test All Active'}</span>
            </button>
            <button
              onClick={load}
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

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
            {[
              { label: 'Healthy',        value: summary.healthy,       color: 'text-emerald-400', Icon: CheckCircle },
              { label: 'Warning',        value: summary.warning,       color: summary.warning > 0 ? 'text-amber-400' : 'text-slate-600', Icon: AlertTriangle },
              { label: 'Timed Out',      value: summary.timeout,       color: summary.timeout > 0 ? 'text-amber-400' : 'text-slate-600', Icon: Clock },
              { label: 'Failed',         value: summary.failed,        color: summary.failed > 0 ? 'text-red-400' : 'text-slate-600', Icon: XCircle },
              { label: 'Not Configured', value: summary.notConfigured, color: 'text-slate-500', Icon: AlertCircle },
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
        )}

        {/* Bulk error banner */}
        {bulkErrors.length > 0 && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm font-medium text-red-400">{bulkErrors.length} providers failed to test</p>
            </div>
            {bulkErrors.map((e, i) => <p key={i} className="text-xs text-red-400/70 ml-6">{e}</p>)}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f.key
                    ? 'bg-white/[0.08] text-white'
                    : `${f.color} hover:bg-white/[0.04]`
                }`}
              >
                {f.label}
                <span className={`text-xs font-mono ${filter === f.key ? 'text-slate-400' : 'text-slate-700'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 flex-wrap">
            <button
              onClick={() => setCatFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${catFilter === 'all' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
            {allCategories.map((cat) => {
              const Icon = CAT_ICON[cat] ?? Zap;
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    catFilter === cat ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{CAT_LABEL[cat] ?? cat}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search providers…"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.04] transition-all"
            />
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 mb-5">
          <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            Tests run credential validation and configuration checks locally — no live API calls are made. Results are persisted and shown on every load. Use "Test All Active" to run a full health sweep. Inactive providers are skipped.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading providers…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={load} className="ml-auto text-xs text-slate-400 hover:text-slate-200">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Provider list */}
        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No providers match your filters.</p>
                <p className="text-xs mt-1">Configure providers in the Integration Control Center first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((record) => (
                  <ProviderCard
                    key={record.id}
                    record={record}
                    onRunTest={handleRunTest}
                    running={runningId === record.id}
                    expanded={expandedId === record.id}
                    onToggleExpand={() => handleExpand(record)}
                    history={testHistories[record.id] ?? []}
                    historyLoading={historyLoading[record.id] ?? false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0D1120] border border-white/[0.12] text-white text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
