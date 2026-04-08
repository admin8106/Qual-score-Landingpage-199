import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart2, Calendar, AlertTriangle, Activity, Star,
  Search, RefreshCw, ChevronDown, X, CheckCircle, TrendingUp,
  Lock, LogOut, PhoneMissed, Mail, Phone, ChevronRight, Zap, Cpu,
} from 'lucide-react';
import { adminApi, type AdminLeadRecord, type EarlyLeadRecord } from '../api/services/admin';
import { supabase } from '../lib/supabase';
import { friendlyMessage, isNetworkError } from '../utils/errorUtils';
import {
  computeStats, applyFilters,
  DEFAULT_FILTERS, type AdminFilters,
  BAND_LABELS, BAND_COLORS, TAG_LABELS, TAG_COLORS,
  bandFromLabel, formatDate, type ScoreBandKey,
} from '../services/adminService';
import LeadDetailDrawer from '../components/admin/LeadDetailDrawer';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';

// ─── Early lead types ─────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  CTA_CLICKED:     'CTA Clicked',
  PAYMENT_STARTED: 'Payment Started',
  PAYMENT_DONE:    'Payment Done',
  PROFILE_FILLED:  'Profile Filled',
  DIAGNOSTIC_DONE: 'Diagnostic Done',
};

const DROP_TAG_LABELS: Record<string, string> = {
  payment_drop:    'Payment Drop',
  profile_drop:    'Profile Drop',
  diagnostic_drop: 'Diagnostic Drop',
};

const DROP_TAG_COLORS: Record<string, string> = {
  payment_drop:    'bg-red-500/10 text-red-400 border border-red-500/20',
  profile_drop:    'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  diagnostic_drop: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

// ─── Incomplete leads panel ───────────────────────────────────────────────────

function IncompleteLeadsPanel({ token }: { token: string }) {
  const [leads, setLeads]         = useState<EarlyLeadRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expanded, setExpanded]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await adminApi.getEarlyLeads({ limit: 100, incomplete: true }, token);
    if (!result.ok || !result.data) {
      setLoadError('Could not load incomplete leads.');
      setLoading(false);
      return;
    }
    setLeads(result.data);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const dropLeads = leads.filter((l) => (l.dropTags ?? []).length > 0);
  const allIncomplete = leads;
  const shown = expanded ? allIncomplete : dropLeads.slice(0, 8);
  const total = allIncomplete.length;
  const drops = dropLeads.length;

  return (
    <div className="mb-7 bg-white/[0.02] border border-amber-500/20 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <PhoneMissed className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Incomplete Leads — BD Recovery Queue</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading ? 'Loading...' : `${drops} drop${drops !== 1 ? 's' : ''} · ${total} total incomplete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!loading && total > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              {expanded ? 'Show drops only' : `Show all ${total}`}
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <p className="text-xs text-amber-400">{loadError}</p>
          <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 ml-1">Retry</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-slate-600">No incomplete leads to recover.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {shown.map((lead) => {
            const tags = lead.dropTags ?? [];
            const stageLabel = STAGE_LABELS[lead.funnelStage] ?? lead.funnelStage;
            const hasContact = lead.email || lead.phone;
            return (
              <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-300 truncate">
                      {lead.name || <span className="text-slate-600 italic">Unknown name</span>}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500 border border-white/[0.07]">
                      {stageLabel}
                    </span>
                    {tags.map((t) => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${DROP_TAG_COLORS[t] ?? 'bg-slate-500/10 text-slate-400'}`}>
                        {DROP_TAG_LABELS[t] ?? t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </a>
                    )}
                    {!hasContact && (
                      <span className="text-xs text-slate-700 italic">No contact info yet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lead.paymentStatus === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : lead.paymentStatus === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-white/[0.04] text-slate-600 border border-white/[0.06]'
                  }`}>
                    {lead.paymentStatus === 'completed' ? 'Paid' : lead.paymentStatus === 'pending' ? 'Pending' : 'No payment'}
                  </span>
                  <span className="text-xs text-slate-700">
                    {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Funnel summary ───────────────────────────────────────────────────────────

interface FunnelCounts {
  landing: number;
  paid: number;
  reports: number;
  booked: number;
}

function FunnelSummaryBar() {
  const [counts, setCounts] = useState<FunnelCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error: queryError } = await supabase
        .from('analytics_events')
        .select('event_name');
      if (cancelled) return;
      if (queryError || !data) {
        setCounts({ landing: 0, paid: 0, reports: 0, booked: 0 });
        return;
      }
      const tally: FunnelCounts = { landing: 0, paid: 0, reports: 0, booked: 0 };
      for (const row of data) {
        if (row.event_name === 'landing_page_view') tally.landing++;
        if (row.event_name === 'payment_success')   tally.paid++;
        if (row.event_name === 'report_generated')  tally.reports++;
        if (row.event_name === 'consultation_booked') tally.booked++;
      }
      setCounts(tally);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const items = [
    { label: 'Total Visitors', value: counts?.landing ?? '—', color: 'text-slate-300' },
    { label: 'Paid Users',     value: counts?.paid    ?? '—', color: 'text-blue-400'  },
    { label: 'Reports Generated', value: counts?.reports ?? '—', color: 'text-emerald-400' },
    { label: 'Consultations Booked', value: counts?.booked ?? '—', color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex flex-col gap-1"
        >
          <span className={`text-2xl font-bold leading-none ${item.color}`}>{item.value}</span>
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, highlight }: StatCardProps) {
  return (
    <div className={`bg-white/[0.03] border rounded-xl p-4 ${highlight ? 'border-blue-500/20' : 'border-white/[0.07]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ─── Filter select ────────────────────────────────────────────────────────────

interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

function FilterSelect({ value, onChange, options, placeholder }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-blue-500/40 transition-colors cursor-pointer"
      >
        <option value="all" className="bg-[#0D1120]">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0D1120]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
    </div>
  );
}

// ─── Tag chips ────────────────────────────────────────────────────────────────

function TagChips({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 2);
  const rest = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${TAG_COLORS[t] ?? 'bg-slate-500/10 text-slate-400'}`}
        >
          {TAG_LABELS[t] ?? t}
        </span>
      ))}
      {rest > 0 && (
        <span className="px-1.5 py-0.5 rounded-md text-xs text-slate-600 bg-white/[0.04]">
          +{rest}
        </span>
      )}
    </div>
  );
}

// ─── Band pill ────────────────────────────────────────────────────────────────

function BandPill({ bandKey }: { bandKey: ScoreBandKey }) {
  const c = BAND_COLORS[bandKey];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1 h-1 rounded-full ${c.dot}`} />
      {BAND_LABELS[bandKey]}
    </span>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH:   'bg-red-500/10 text-red-400 border-red-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    LOW:    'bg-slate-500/10 text-slate-500 border-white/[0.06]',
  };
  const cls = map[priority?.toUpperCase()] ?? map.LOW;
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 font-semibold ${cls}`}>
      {priority}
    </span>
  );
}

// ─── Unauthorised screen ──────────────────────────────────────────────────────

function UnauthorisedState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-1">
        <Lock className="w-5 h-5 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-red-400">Access Denied</p>
      <p className="text-xs text-slate-500 text-center max-w-xs">
        You are not authorised to view this page. Admin authentication will be required.
      </p>
    </div>
  );
}

// ─── Static filter options ────────────────────────────────────────────────────

const BAND_FILTER_OPTIONS = [
  { value: 'critical',           label: 'Not Competitive' },
  { value: 'needs_optimization', label: 'Needs Optimization' },
  { value: 'strong',             label: 'Strong' },
];

const CONSULTATION_FILTER_OPTIONS = [
  { value: 'booked',     label: 'Booked' },
  { value: 'not_booked', label: 'Not Booked' },
];

const CAREER_STAGE_OPTIONS = [
  { value: 'fresher',               label: 'Fresher' },
  { value: 'working_professional',  label: 'Working Professional' },
];

const TAG_FILTER_OPTIONS = [
  { value: 'high_pain_lead',           label: 'High Pain' },
  { value: 'premium_lead',             label: 'Premium Lead' },
  { value: 'warm_diagnostic_lead',     label: 'Warm Diagnostic' },
  { value: 'consultation_priority',    label: 'Consult Priority' },
  { value: 'high_intent',             label: 'High Intent' },
  { value: 'warm_lead',               label: 'Warm Lead' },
  { value: 'nurture_after_report',    label: 'Nurture' },
  { value: 'low_immediate_conversion', label: 'Low Conv.' },
];

const TABLE_HEADERS = [
  'Name / Contact',
  'Role & Industry',
  'Exp.',
  'Score',
  'Band',
  'Tags',
  'Priority',
  'Consultation',
  'Payment',
  'Created',
];

// ─── Main page ────────────────────────────────────────────────────────────────

type LoadPhase = 'loading' | 'ok' | 'error' | 'unauthorised';

export default function AdminPage() {
  const navigate = useNavigate();
  const { token, profile, logout } = useAdminAuth();
  const [leads, setLeads]             = useState<AdminLeadRecord[]>([]);
  const [phase, setPhase]             = useState<LoadPhase>('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [filters, setFilters]         = useState<AdminFilters>(DEFAULT_FILTERS);
  const [selectedLead, setSelectedLead] = useState<AdminLeadRecord | null>(null);
  const [totalCount, setTotalCount]   = useState(0);

  const load = useCallback(async () => {
    if (!token) {
      logout();
      navigate(ROUTES.ADMIN_LOGIN, { replace: true });
      return;
    }
    setPhase('loading');
    setErrorMsg('');

    const result = await adminApi.getLeads({ pageSize: 500 }, token);

    if (!result.ok) {
      if (result.error.code === 'UNAUTHORIZED' || result.error.code === 'FORBIDDEN') {
        logout();
        navigate(ROUTES.ADMIN_LOGIN, { replace: true });
        return;
      }
      setErrorMsg(
        isNetworkError(result.error)
          ? 'No internet connection. Please check your network and try again.'
          : friendlyMessage(result.error, 'Unable to load leads. Please try again.')
      );
      setPhase('error');
      return;
    }

    const items = result.data.items ?? [];
    setLeads(items);
    setTotalCount(result.data.total ?? items.length);
    setPhase('ok');
  }, [token, logout, navigate]);

  useEffect(() => { load(); }, [load]);

  const filtered = applyFilters(leads, filters);
  const stats    = computeStats(leads);

  const updateFilter = <K extends keyof AdminFilters>(key: K, val: AdminFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: val }));

  const hasActiveFilters =
    !!filters.search ||
    filters.band !== 'all' ||
    filters.consultationStatus !== 'all' ||
    filters.tag !== 'all' ||
    filters.careerStage !== 'all';

  const isLoading = phase === 'loading';

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* ── Header ── */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">QualScore</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-400">Funnel Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(ROUTES.ADMIN_INTEGRATIONS)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Integrations</span>
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_OPS)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Ops Panel
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_LAUNCH)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Launch Checklist</span>
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_ANALYTICS)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Funnel Analytics
            </button>
            {profile && (
              <span className="hidden sm:inline text-xs text-slate-600">
                {profile.fullName || profile.email}
              </span>
            )}
            <button
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => { logout(); navigate(ROUTES.ADMIN_LOGIN, { replace: true }); }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Title ── */}
        <div className="mb-7">
          <h1 className="text-xl font-bold text-white">₹199 Diagnostic Funnel Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track purchases, diagnostic completions, consultation bookings, and lead priority.
            {phase === 'ok' && totalCount > leads.length && (
              <span className="ml-1 text-slate-600">
                Showing {leads.length} of {totalCount} total.
              </span>
            )}
          </p>
        </div>

        {/* ── Funnel summary ── */}
        <FunnelSummaryBar />

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-7">
          <StatCard label="Total Purchases"        value={stats.totalPurchases}       icon={Users}         iconBg="bg-blue-500/10"    iconColor="text-blue-400"    highlight />
          <StatCard label="Completed Diagnostics"  value={stats.completedDiagnostics}  icon={BarChart2}     iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
          <StatCard label="Consultation Bookings"  value={stats.consultationBookings}  icon={Calendar}      iconBg="bg-blue-500/10"    iconColor="text-blue-400"    />
          <StatCard label="High Pain Leads"        value={stats.highPainLeads}         icon={AlertTriangle} iconBg="bg-red-500/10"     iconColor="text-red-400"     />
          <StatCard label="Warm Diagnostic Leads"  value={stats.warmDiagnosticLeads}   icon={Activity}      iconBg="bg-amber-500/10"   iconColor="text-amber-400"   />
          <StatCard label="Premium Leads"          value={stats.premiumLeads}          icon={Star}          iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
        </div>

        {/* ── Incomplete leads recovery queue ── */}
        {phase === 'ok' && token && <IncompleteLeadsPanel token={token} />}

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              placeholder="Search name, email, role, industry..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs rounded-xl placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={filters.band}
              onChange={(v) => updateFilter('band', v as AdminFilters['band'])}
              options={BAND_FILTER_OPTIONS}
              placeholder="All Bands"
            />
            <FilterSelect
              value={filters.consultationStatus}
              onChange={(v) => updateFilter('consultationStatus', v as AdminFilters['consultationStatus'])}
              options={CONSULTATION_FILTER_OPTIONS}
              placeholder="All Consultations"
            />
            <FilterSelect
              value={filters.tag}
              onChange={(v) => updateFilter('tag', v)}
              options={TAG_FILTER_OPTIONS}
              placeholder="All Tags"
            />
            <FilterSelect
              value={filters.careerStage}
              onChange={(v) => updateFilter('careerStage', v as AdminFilters['careerStage'])}
              options={CAREER_STAGE_OPTIONS}
              placeholder="All Stages"
            />
            {hasActiveFilters && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Record count ── */}
        {phase === 'ok' && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-600">
              Showing <span className="text-slate-400 font-semibold">{filtered.length}</span> of {leads.length} leads
              {hasActiveFilters && <span className="text-slate-600"> (filtered)</span>}
            </p>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading leads...</p>
            </div>
          ) : phase === 'unauthorised' ? (
            <UnauthorisedState />
          ) : phase === 'error' ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{errorMsg}</p>
              <button
                onClick={load}
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Search className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-slate-500">No leads match the current filters.</p>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {TABLE_HEADERS.map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const bandKey = bandFromLabel(lead.bandLabel);
                    const tags    = lead.tags ?? [];

                    return (
                      <tr
                        key={lead.candidateCode}
                        onClick={() => setSelectedLead(lead)}
                        className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${i === filtered.length - 1 ? 'border-0' : ''}`}
                      >
                        {/* Name / Contact */}
                        <td className="px-4 py-3.5 min-w-[180px]">
                          <p className="font-semibold text-slate-200">{lead.fullName}</p>
                          <p className="text-slate-600 mt-0.5">{lead.email}</p>
                          {lead.mobileNumber && <p className="text-slate-700 mt-0.5">{lead.mobileNumber}</p>}
                        </td>

                        {/* Role & Industry */}
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <p className="text-slate-300">{lead.currentRole || '—'}</p>
                          <p className="text-slate-600 mt-0.5">{lead.industry || '—'}</p>
                        </td>

                        {/* Experience */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-slate-400">{lead.yearsExperience != null ? `${lead.yearsExperience} yrs` : '—'}</p>
                          <p className="text-slate-600 mt-0.5 capitalize">{lead.careerStage?.replace('_', ' ') || '—'}</p>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3.5">
                          {lead.finalEmployabilityScore != null ? (
                            <span className="font-mono font-bold text-white">{lead.finalEmployabilityScore.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>

                        {/* Band */}
                        <td className="px-4 py-3.5">
                          {bandKey
                            ? <BandPill bandKey={bandKey} />
                            : lead.bandLabel
                              ? <span className="text-xs text-slate-500">{lead.bandLabel}</span>
                              : <span className="text-slate-700">—</span>
                          }
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-3.5 min-w-[140px]">
                          {tags.length > 0 ? <TagChips tags={tags} /> : <span className="text-slate-700">—</span>}
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3.5">
                          {lead.leadPriority
                            ? <PriorityBadge priority={lead.leadPriority} />
                            : <span className="text-slate-700">—</span>
                          }
                        </td>

                        {/* Consultation */}
                        <td className="px-4 py-3.5">
                          {lead.consultationBooked ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400">
                                {lead.consultationStatus === 'CONFIRMED' ? 'Confirmed' : 'Booked'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">Not booked</span>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-3.5">
                          {lead.paymentStatus ? (
                            <span className={`inline-flex items-center gap-1 ${
                              lead.paymentStatus.toLowerCase() === 'completed' || lead.paymentStatus.toLowerCase() === 'success'
                                ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                lead.paymentStatus.toLowerCase() === 'completed' || lead.paymentStatus.toLowerCase() === 'success'
                                  ? 'bg-emerald-400' : 'bg-amber-400'
                              }`} />
                              {lead.paymentStatus.toLowerCase() === 'completed' ? 'Paid' : lead.paymentStatus}
                            </span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {formatDate(lead.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-700 text-center mt-4">
          QualScore Admin · Internal use only · {phase === 'ok' ? `${filtered.length} record${filtered.length !== 1 ? 's' : ''} shown` : '—'}
        </p>
      </div>

      {/* ── Detail drawer ── */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
