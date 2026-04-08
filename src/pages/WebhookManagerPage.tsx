import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Copy, Check, ChevronDown, ChevronUp, Play, RotateCcw,
  CreditCard, MessageCircle, Mail, Users, BarChart2, Calendar,
  Webhook, ExternalLink, Info, Search, Filter, Activity, Eye,
  AlertCircle, Zap, Shield, List,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';
import {
  webhookApi,
  type RegisteredEndpoint,
  type WebhookEventLog,
  type WebhookEventStatus,
  type WebhookCategory,
} from '../api/services/webhooks';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  payments: CreditCard, whatsapp: MessageCircle, email: Mail,
  crm: Users, analytics: BarChart2, scheduling: Calendar,
};

const CAT_LABEL: Record<string, string> = {
  payments: 'Payments', whatsapp: 'WhatsApp', email: 'Email',
  crm: 'CRM', analytics: 'Analytics', scheduling: 'Scheduling',
};

const CAT_COLOR: Record<string, string> = {
  payments:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  whatsapp:   'text-green-400 bg-green-500/10 border-green-500/20',
  email:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  crm:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  analytics:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  scheduling: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const STATUS_META: Record<WebhookEventStatus | 'all', { label: string; color: string; Icon: React.ElementType }> = {
  all:        { label: 'All',        color: 'text-slate-400',   Icon: List },
  RECEIVED:   { label: 'Received',   color: 'text-slate-400',   Icon: Clock },
  PROCESSING: { label: 'Processing', color: 'text-amber-400',   Icon: AlertTriangle },
  SUCCESS:    { label: 'Success',    color: 'text-emerald-400', Icon: CheckCircle },
  FAILED:     { label: 'Failed',     color: 'text-red-400',     Icon: XCircle },
  REPLAYED:   { label: 'Replayed',   color: 'text-sky-400',     Icon: RotateCcw },
  SKIPPED:    { label: 'Skipped',    color: 'text-slate-600',   Icon: AlertCircle },
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={doCopy}
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-lg px-2.5 py-1.5 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

// ─── URL row ──────────────────────────────────────────────────────────────────

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-sky-300 bg-sky-500/5 border border-sky-500/15 rounded-lg px-3 py-2 truncate">
          {value}
        </code>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WebhookEventStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.RECEIVED;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${m.color} ${
      status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20' :
      status === 'FAILED'  ? 'bg-red-500/10 border-red-500/20' :
      status === 'REPLAYED'? 'bg-sky-500/10 border-sky-500/20' :
      'bg-slate-500/10 border-white/[0.06]'
    }`}>
      <m.Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

// ─── Endpoint card ────────────────────────────────────────────────────────────

interface EndpointCardProps {
  ep: RegisteredEndpoint;
  expanded: boolean;
  onToggle: () => void;
  onSimulate: (ep: RegisteredEndpoint) => void;
  simulating: boolean;
  canTest: boolean;
}

function EndpointCard({ ep, expanded, onToggle, onSimulate, simulating, canTest }: EndpointCardProps) {
  const CatIcon = CAT_ICON[ep.category] ?? Webhook;
  const catColor = CAT_COLOR[ep.category] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  const hasRecentFailure = ep.last24hFailures > 0;
  const borderClass = !ep.isActive ? 'border-white/[0.06]' :
    hasRecentFailure ? 'border-red-500/20' :
    ep.latestEvent?.status === 'SUCCESS' ? 'border-emerald-500/15' :
    'border-white/[0.07]';

  return (
    <div className={`bg-white/[0.02] border rounded-2xl overflow-hidden transition-all ${borderClass}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${catColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-white">{ep.providerName}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${catColor}`}>
                {CAT_LABEL[ep.category] ?? ep.category}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                ep.isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-slate-600 bg-slate-500/10 border-white/[0.06]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ep.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                {ep.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                ep.environmentMode === 'LIVE'
                  ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : 'text-slate-500 bg-slate-500/10 border-white/[0.06]'
              }`}>
                {ep.environmentMode}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-2">{ep.description}</p>

            {/* URL row (compact) */}
            <div className="flex items-center gap-2 mb-2">
              <code className="text-xs font-mono text-sky-400/80 bg-sky-500/5 border border-sky-500/10 rounded px-2 py-0.5 truncate max-w-xs">
                {ep.path}
              </code>
              <CopyButton text={ep.fullUrl} label="Copy URL" />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-slate-600" />
                <span className="text-xs text-slate-600">{ep.last24hCount} events (24h)</span>
                {ep.last24hFailures > 0 && (
                  <span className="text-xs text-red-400">{ep.last24hFailures} failed</span>
                )}
              </div>
              {ep.lastSuccessAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-slate-600">
                    Last success: {new Date(ep.lastSuccessAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {ep.lastFailureAt && (
                <div className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400/70">
                    Last failure: {new Date(ep.lastFailureAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canTest && (
              <button
                onClick={() => onSimulate(ep)}
                disabled={simulating}
                title="Simulate a test inbound event"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
              >
                {simulating
                  ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  : <Zap className="w-3 h-3" />
                }
                <span className="hidden sm:inline">Simulate</span>
              </button>
            )}
            <button
              onClick={onToggle}
              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: setup instructions + full URL */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Endpoint URL</p>
            <UrlRow label="Full URL (paste in provider dashboard)" value={ep.fullUrl} />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Setup Instructions</p>
            <div className="space-y-2">
              {ep.setupInstructions.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.06] text-xs flex items-center justify-center text-slate-500 shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs text-slate-500">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {ep.replayable && (
            <div className="flex items-start gap-2.5 bg-sky-500/5 border border-sky-500/15 rounded-xl px-3 py-2.5">
              <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-400/80">
                Failed events from this endpoint can be replayed from the event log below. Replay re-submits the stored payload for reprocessing — safe to run in sandbox.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Event log row ────────────────────────────────────────────────────────────

interface EventLogRowProps {
  log: WebhookEventLog;
  onReplay: (log: WebhookEventLog) => void;
  replaying: boolean;
  expanded: boolean;
  onToggle: () => void;
  canTest: boolean;
}

function EventLogRow({ log, onReplay, replaying, expanded, onToggle, canTest }: EventLogRowProps) {
  const sm = STATUS_META[log.status] ?? STATUS_META.RECEIVED;
  const canReplay = canTest && log.status === 'FAILED' && webhookApi.ENDPOINT_REGISTRY.find((e) => e.slug === log.endpoint_slug)?.replayable;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <sm.Icon className={`w-3.5 h-3.5 ${sm.color} shrink-0`} />

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0.5">
          <div className="min-w-0">
            <p className="text-sm text-white font-mono truncate">{log.event_type}</p>
            <p className="text-xs text-slate-600 truncate">{log.processing_summary ?? log.error_detail ?? '—'}</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border self-start ${CAT_COLOR[log.category] ?? 'text-slate-500 bg-slate-500/10 border-white/[0.06]'}`}>
            {(() => { const CatI = CAT_ICON[log.category]; return CatI ? <CatI className="w-2.5 h-2.5" /> : null; })()}
            {CAT_LABEL[log.category] ?? log.category}
          </span>
          <span className="text-xs text-slate-500 self-start whitespace-nowrap">{log.provider_name}</span>
          <span className="text-xs text-slate-700 self-start whitespace-nowrap">
            {new Date(log.received_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <StatusBadge status={log.status} />

        <div className="flex items-center gap-1 shrink-0">
          {canReplay && (
            <button
              onClick={() => onReplay(log)}
              disabled={replaying}
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 rounded-lg px-2 py-1 transition-colors disabled:opacity-40"
              title="Replay this failed event"
            >
              {replaying
                ? <div className="w-3 h-3 border border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                : <RotateCcw className="w-3 h-3" />
              }
              <span className="hidden sm:inline">Replay</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Endpoint', value: log.endpoint_slug },
              { label: 'Method',   value: log.http_method },
              { label: 'Source IP', value: log.source_ip ?? '—' },
              { label: 'Retries',  value: String(log.retry_count) },
              { label: 'Idempotency Key', value: log.idempotency_key ?? '—' },
              { label: 'Environment', value: log.environment_mode },
              { label: 'Received', value: new Date(log.received_at).toLocaleString('en-IN') },
              { label: 'Processed', value: log.processed_at ? new Date(log.processed_at).toLocaleString('en-IN') : '—' },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-slate-600 mb-0.5">{f.label}</p>
                <p className="text-slate-400 font-mono truncate" title={f.value}>{f.value}</p>
              </div>
            ))}
          </div>

          {log.error_detail && (
            <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
              <p className="text-xs text-slate-600 mb-1">Error Detail</p>
              <p className="text-xs text-red-400 font-mono">{log.error_detail}</p>
            </div>
          )}

          {log.last_replayed_at && (
            <p className="text-xs text-slate-600">
              Last replayed: {new Date(log.last_replayed_at).toLocaleString('en-IN')} by {log.replayed_by_email}
            </p>
          )}

          <details className="group">
            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 select-none">
              View raw payload
            </summary>
            <pre className="mt-2 text-xs text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 overflow-auto max-h-48">
              {JSON.stringify(log.raw_payload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = 'endpoints' | 'logs';

export default function WebhookManagerPage() {
  const navigate = useNavigate();
  const { profile, permissions } = useAdminAuth();
  const adminEmail = profile?.email ?? 'admin';
  const canTest = permissions.canTestIntegration;

  // Endpoints state
  const [endpoints, setEndpoints] = useState<RegisteredEndpoint[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(true);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [simulatingSlug, setSimulatingSlug] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<WebhookEventLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('endpoints');
  const [statusFilter, setStatusFilter] = useState<WebhookEventStatus | 'all'>('all');
  const [catFilter, setCatFilter] = useState<WebhookCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [endpointsError, setEndpointsError] = useState('');
  const [logsError, setLogsError] = useState('');

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  const loadEndpoints = useCallback(async () => {
    setEndpointsLoading(true);
    setEndpointsError('');
    try {
      const data = await webhookApi.listEndpoints();
      setEndpoints(data);
    } catch {
      setEndpointsError('Could not load webhook endpoints. Check your connection and retry.');
    } finally {
      setEndpointsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const { logs: data, total } = await webhookApi.getLogs({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: catFilter === 'all' ? undefined : catFilter,
        search: search || undefined,
        limit: 50,
      });
      setLogs(data);
      setLogsTotal(total);
    } catch {
      setLogsError('Could not load event logs. Try refreshing.');
    } finally {
      setLogsLoading(false);
    }
  }, [statusFilter, catFilter, search]);

  useEffect(() => { loadEndpoints(); }, [loadEndpoints]);
  useEffect(() => { if (viewMode === 'logs') loadLogs(); }, [viewMode, loadLogs]);

  async function handleSimulate(ep: RegisteredEndpoint) {
    setSimulatingSlug(ep.slug);
    try {
      await webhookApi.simulateInboundEvent({
        slug: ep.slug,
        eventType: `${ep.category}.test_event`,
        adminEmail,
      });
      showToast(`Simulated event created for ${ep.providerName}`);
      await loadEndpoints();
      if (viewMode === 'logs') await loadLogs();
    } catch (e) {
      showToast(`Simulate failed: ${(e as Error).message}`);
    } finally {
      setSimulatingSlug(null);
    }
  }

  async function handleReplay(log: WebhookEventLog) {
    setReplayingId(log.id);
    try {
      const result = await webhookApi.replayEvent(log.id, adminEmail);
      setLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? { ...l, status: result.newStatus, retry_count: l.retry_count + 1, processing_summary: result.message, last_replayed_at: new Date().toISOString(), replayed_by_email: adminEmail }
            : l
        )
      );
      showToast(result.message);
    } catch (e) {
      showToast(`Replay failed: ${(e as Error).message}`);
    } finally {
      setReplayingId(null);
    }
  }

  // Summary counts from endpoints
  const summary = {
    total: endpoints.length,
    active: endpoints.filter((e) => e.isActive).length,
    recentFailures: endpoints.reduce((n, e) => n + e.last24hFailures, 0),
    events24h: endpoints.reduce((n, e) => n + e.last24hCount, 0),
  };

  const allCategories = [...new Set(endpoints.map((e) => e.category))] as WebhookCategory[];

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
            <Webhook className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Webhook Manager</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
              <button
                onClick={() => setViewMode('endpoints')}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'endpoints' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Endpoints
              </button>
              <button
                onClick={() => setViewMode('logs')}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'logs' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Event Log
              </button>
            </div>
            <button
              onClick={() => { loadEndpoints(); if (viewMode === 'logs') loadLogs(); }}
              disabled={endpointsLoading || logsLoading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${endpointsLoading || logsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {[
            { label: 'Endpoints',     value: summary.total,          color: 'text-slate-300', Icon: Webhook },
            { label: 'Active',        value: summary.active,         color: 'text-emerald-400', Icon: CheckCircle },
            { label: 'Events (24h)',  value: summary.events24h,      color: 'text-sky-400',     Icon: Activity },
            { label: 'Failures (24h)',value: summary.recentFailures, color: summary.recentFailures > 0 ? 'text-red-400' : 'text-slate-600', Icon: XCircle },
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

        {/* ── ENDPOINTS VIEW ─────────────────────────────────────────────────── */}
        {viewMode === 'endpoints' && (
          <>
            <div className="flex items-start gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 mb-5">
              <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                These are all system webhook endpoints. Expand any card to copy the URL and see setup instructions for your provider dashboard. Use "Simulate" to create a test event record without hitting a live provider.
              </p>
            </div>

            {endpointsLoading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-600">Loading endpoints…</p>
              </div>
            ) : endpointsError ? (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400 flex-1">{endpointsError}</p>
                <button
                  onClick={loadEndpoints}
                  className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.10] rounded-lg px-3 py-1.5 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {endpoints.map((ep) => (
                  <EndpointCard
                    key={ep.slug}
                    ep={ep}
                    expanded={expandedEndpoint === ep.slug}
                    onToggle={() => setExpandedEndpoint(expandedEndpoint === ep.slug ? null : ep.slug)}
                    onSimulate={handleSimulate}
                    simulating={simulatingSlug === ep.slug}
                    canTest={canTest}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── EVENT LOG VIEW ─────────────────────────────────────────────────── */}
        {viewMode === 'logs' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {/* Status pills */}
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 flex-wrap">
                {(['all', 'SUCCESS', 'FAILED', 'REPLAYED', 'RECEIVED'] as const).map((s) => {
                  const m = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        statusFilter === s ? 'bg-white/[0.08] text-white' : `${m.color} hover:bg-white/[0.04]`
                      }`}
                    >
                      <m.Icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 flex-wrap">
                <button
                  onClick={() => setCatFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${catFilter === 'all' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  All
                </button>
                {allCategories.map((cat) => {
                  const Icon = CAT_ICON[cat] ?? Webhook;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCatFilter(cat)}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${catFilter === cat ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{CAT_LABEL[cat]}</span>
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
                  onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
                  placeholder="Search events, providers, summaries…"
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-white/[0.15] transition-all"
                />
              </div>

              <button
                onClick={loadLogs}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-cyan-700 hover:bg-cyan-600 rounded-xl px-4 py-2 transition-colors"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-600">{logsTotal} events total</p>
            </div>

            {logsLoading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-600">Loading events…</p>
              </div>
            ) : logsError ? (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400 flex-1">{logsError}</p>
                <button
                  onClick={loadLogs}
                  className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.10] rounded-lg px-3 py-1.5 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Webhook className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No events match your filters.</p>
                <p className="text-xs mt-1">Use "Simulate" on an endpoint to create test events.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <EventLogRow
                    key={log.id}
                    log={log}
                    onReplay={handleReplay}
                    replaying={replayingId === log.id}
                    expanded={expandedLogId === log.id}
                    onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    canTest={canTest}
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
