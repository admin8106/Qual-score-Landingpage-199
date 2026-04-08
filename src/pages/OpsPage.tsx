import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, Search, RefreshCw, LogOut, ChevronDown,
  CheckCircle, MessageSquare, StickyNote, X, ArrowUp, ArrowDown,
  AlertTriangle, Zap, Filter, Send, Loader2, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { adminApi, type AdminLeadRecord } from '../api/services/admin';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';
import { bandFromLabel, BAND_LABELS, BAND_COLORS, type ScoreBandKey } from '../services/adminService';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'latest' | 'priority' | 'score';
type QuickFilter = 'all' | 'high_priority' | 'payment_done' | 'report_generated' | 'not_booked';

interface OpsAction {
  id: string;
  candidate_code: string;
  action_type: 'contacted' | 'booked' | 'note';
  note: string | null;
  created_by: string | null;
  created_at: string;
}

interface LeadActions {
  contacted: boolean;
  booked: boolean;
  notes: OpsAction[];
  lastActionAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all',               label: 'All Leads'      },
  { key: 'high_priority',     label: 'High Priority'  },
  { key: 'payment_done',      label: 'Payment Done'   },
  { key: 'report_generated',  label: 'Report Ready'   },
  { key: 'not_booked',        label: 'Not Booked'     },
];

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, '': 3 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.startsWith('+91') ? phone : `+91${phone.replace(/^0/, '')}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function applyQuickFilter(leads: AdminLeadRecord[], filter: QuickFilter): AdminLeadRecord[] {
  switch (filter) {
    case 'high_priority':
      return leads.filter((l) => l.leadPriority?.toUpperCase() === 'HIGH');
    case 'payment_done':
      return leads.filter((l) => {
        const s = l.paymentStatus?.toLowerCase();
        return s === 'completed' || s === 'success';
      });
    case 'report_generated':
      return leads.filter((l) => {
        const s = l.reportStatus?.toUpperCase();
        return s === 'COMPLETED' || s === 'GENERATED' || s === 'RULE_BASED';
      });
    case 'not_booked':
      return leads.filter((l) => !l.consultationBooked);
    default:
      return leads;
  }
}

function applySort(leads: AdminLeadRecord[], sort: SortKey): AdminLeadRecord[] {
  return [...leads].sort((a, b) => {
    if (sort === 'priority') {
      const pa = PRIORITY_ORDER[a.leadPriority?.toUpperCase() ?? ''] ?? 3;
      const pb = PRIORITY_ORDER[b.leadPriority?.toUpperCase() ?? ''] ?? 3;
      if (pa !== pb) return pa - pb;
    }
    if (sort === 'score') {
      return (b.finalEmployabilityScore ?? 0) - (a.finalEmployabilityScore ?? 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority?: string }) {
  const p = priority?.toUpperCase();
  if (p === 'HIGH')   return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
  if (p === 'MEDIUM') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />;
}

function ScoreBadge({ score, bandLabel }: { score?: number; bandLabel?: string }) {
  const bandKey = bandFromLabel(bandLabel) as ScoreBandKey | null;
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  const color = bandKey === 'critical'
    ? 'text-red-400'
    : bandKey === 'needs_optimization'
      ? 'text-amber-400'
      : 'text-emerald-400';
  return (
    <span className={`font-mono font-bold text-sm ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function StatusPill({
  label, color,
}: { label: string; color: 'green' | 'amber' | 'red' | 'slate' }) {
  const cls = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red:   'bg-red-500/10 text-red-400 border-red-500/20',
    slate: 'bg-white/[0.04] text-slate-500 border-white/[0.08]',
  }[color];
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Note modal ───────────────────────────────────────────────────────────────

function NoteModal({
  lead,
  existingNotes,
  onClose,
  onSaved,
  adminName,
}: {
  lead: AdminLeadRecord;
  existingNotes: OpsAction[];
  onClose: () => void;
  onSaved: (action: OpsAction) => void;
  adminName: string;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError('');
    const { data, error } = await supabase
      .from('ops_actions')
      .insert({
        candidate_code: lead.candidateCode,
        action_type: 'note',
        note: trimmed,
        created_by: adminName,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onSaved(data as OpsAction);
      onClose();
    } else {
      setSaveError('Failed to save note. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0D1120] border border-white/[0.10] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <p className="text-sm font-semibold text-white">Add Note</p>
            <p className="text-xs text-slate-500 mt-0.5">{lead.fullName}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {existingNotes.length > 0 && (
          <div className="px-5 py-3 border-b border-white/[0.06] max-h-40 overflow-y-auto space-y-2">
            {existingNotes.map((n) => (
              <div key={n.id} className="bg-white/[0.03] rounded-lg px-3 py-2">
                <p className="text-xs text-slate-300 leading-relaxed">{n.note}</p>
                <p className="text-xs text-slate-700 mt-1">
                  {n.created_by || 'team'} · {timeAgo(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setSaveError(''); }}
            placeholder="Add a note about this lead..."
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
          />
          {saveError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-700">Ctrl+Enter to save</p>
            <button
              onClick={save}
              disabled={!text.trim() || saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-4 py-2 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  actions,
  onContacted,
  onBooked,
  onNote,
}: {
  lead: AdminLeadRecord;
  actions: LeadActions;
  onContacted: () => void;
  onBooked: () => void;
  onNote: () => void;
}) {
  const bandKey = bandFromLabel(lead.bandLabel) as ScoreBandKey | null;
  const phone = fmtPhone(lead.mobileNumber);
  const paymentDone = ['completed', 'success'].includes(lead.paymentStatus?.toLowerCase() ?? '');
  const reportReady = ['completed', 'generated', 'rule_based'].includes(lead.reportStatus?.toLowerCase() ?? '');

  return (
    <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <PriorityDot priority={lead.leadPriority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{lead.fullName}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {lead.currentRole || '—'}
                {lead.industry ? ` · ${lead.industry}` : ''}
                {lead.yearsExperience != null ? ` · ${lead.yearsExperience}y` : ''}
              </p>
            </div>
            <ScoreBadge score={lead.finalEmployabilityScore} bandLabel={lead.bandLabel} />
          </div>

          {/* Contact */}
          <div className="flex items-center flex-wrap gap-3 mt-2">
            {phone && (
              <a
                href={`https://wa.me/${phone.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Phone className="w-3 h-3" />
                {phone}
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[160px]">{lead.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center flex-wrap gap-2 px-4 pb-3">
        {bandKey && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BAND_COLORS[bandKey].bg} ${BAND_COLORS[bandKey].text}`}>
            {BAND_LABELS[bandKey]}
          </span>
        )}
        <StatusPill
          label={paymentDone ? 'Paid' : 'No Payment'}
          color={paymentDone ? 'green' : 'slate'}
        />
        {reportReady && <StatusPill label="Report Ready" color="green" />}
        {lead.consultationBooked && <StatusPill label="Booked" color="amber" />}
        {actions.contacted && <StatusPill label="Contacted" color="green" />}
        {actions.lastActionAt && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
            <Clock className="w-3 h-3" />
            {timeAgo(actions.lastActionAt)}
          </span>
        )}
      </div>

      {/* Notes preview */}
      {actions.notes.length > 0 && (
        <div className="mx-4 mb-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{actions.notes[0].note}</p>
          {actions.notes.length > 1 && (
            <p className="text-xs text-slate-700 mt-1">+{actions.notes.length - 1} more note{actions.notes.length > 2 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-4 pb-4 border-t border-white/[0.05] pt-3">
        <button
          onClick={onContacted}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 transition-colors ${
            actions.contacted
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-white/[0.04] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-white/[0.08] hover:border-emerald-500/20'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {actions.contacted ? 'Contacted' : 'Mark Contacted'}
        </button>
        <button
          onClick={onBooked}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 transition-colors ${
            actions.booked || lead.consultationBooked
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-white/[0.04] text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-white/[0.08] hover:border-blue-500/20'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {actions.booked || lead.consultationBooked ? 'Booked' : 'Mark Booked'}
        </button>
        <button
          onClick={onNote}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 bg-white/[0.04] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/20 transition-colors"
        >
          <StickyNote className="w-3.5 h-3.5" />
          {actions.notes.length > 0 ? `Notes (${actions.notes.length})` : 'Note'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const navigate = useNavigate();
  const { token, profile, logout } = useAdminAuth();

  const [leads, setLeads]             = useState<AdminLeadRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sort, setSort]               = useState<SortKey>('priority');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');

  const [opsActions, setOpsActions] = useState<Record<string, LeadActions>>({});
  const [noteModalLead, setNoteModalLead] = useState<AdminLeadRecord | null>(null);
  const [actionError, setActionError] = useState<string>('');

  const adminName = profile?.fullName || profile?.email || 'admin';

  const load = useCallback(async () => {
    if (!token) {
      logout();
      navigate(ROUTES.ADMIN_LOGIN, { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    const result = await adminApi.getLeads({ pageSize: 500 }, token);
    if (!result.ok) {
      if (result.error.code === 'UNAUTHORIZED' || result.error.code === 'FORBIDDEN') {
        logout();
        navigate(ROUTES.ADMIN_LOGIN, { replace: true });
        return;
      }
      setError(result.error.message || 'Failed to load leads.');
      setLoading(false);
      return;
    }
    setLeads(result.data.items ?? []);
    setLoading(false);
  }, [token, logout, navigate]);

  const loadOpsActions = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('ops_actions')
      .select('*')
      .order('created_at', { ascending: false });
    if (queryError || !data) {
      return;
    }
    const grouped: Record<string, LeadActions> = {};
    for (const row of data as OpsAction[]) {
      if (!grouped[row.candidate_code]) {
        grouped[row.candidate_code] = { contacted: false, booked: false, notes: [], lastActionAt: null };
      }
      const g = grouped[row.candidate_code];
      if (row.action_type === 'contacted') g.contacted = true;
      if (row.action_type === 'booked') g.booked = true;
      if (row.action_type === 'note') g.notes.push(row);
      if (!g.lastActionAt || row.created_at > g.lastActionAt) g.lastActionAt = row.created_at;
    }
    setOpsActions(grouped);
  }, []);

  useEffect(() => {
    load();
    loadOpsActions();
  }, [load, loadOpsActions]);

  const markAction = useCallback(async (
    lead: AdminLeadRecord,
    actionType: 'contacted' | 'booked',
  ) => {
    const key = lead.candidateCode;
    const current = opsActions[key];
    if (actionType === 'contacted' && current?.contacted) return;
    if (actionType === 'booked' && current?.booked) return;

    setActionError('');

    const { data, error: insertError } = await supabase
      .from('ops_actions')
      .insert({
        candidate_code: key,
        action_type: actionType,
        created_by: adminName,
      })
      .select()
      .single();

    if (insertError || !data) {
      setActionError('Could not save action. Please try again.');
      return;
    }

    setOpsActions((prev) => {
      const existing = prev[key] ?? { contacted: false, booked: false, notes: [], lastActionAt: null };
      return {
        ...prev,
        [key]: {
          ...existing,
          [actionType]: true,
          lastActionAt: (data as OpsAction).created_at,
        },
      };
    });
  }, [opsActions, adminName]);

  const handleNoteSaved = useCallback((action: OpsAction) => {
    setOpsActions((prev) => {
      const key = action.candidate_code;
      const existing = prev[key] ?? { contacted: false, booked: false, notes: [], lastActionAt: null };
      return {
        ...prev,
        [key]: {
          ...existing,
          notes: [action, ...existing.notes],
          lastActionAt: action.created_at,
        },
      };
    });
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = applyQuickFilter(leads, quickFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        [l.fullName, l.email, l.mobileNumber, l.currentRole, l.industry]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      );
    }
    result = applySort(result, sort);
    if (sort !== 'latest' && sortDir === 'asc') result = result.reverse();
    return result;
  }, [leads, quickFilter, search, sort, sortDir]);

  const stats = useMemo(() => ({
    total: leads.length,
    highPriority: leads.filter((l) => l.leadPriority?.toUpperCase() === 'HIGH').length,
    contacted: Object.values(opsActions).filter((a) => a.contacted).length,
    notBooked: leads.filter((l) => !l.consultationBooked && !opsActions[l.candidateCode]?.booked).length,
  }), [leads, opsActions]);

  return (
    <div className="min-h-screen bg-[#080C18]">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A0F1E]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-white">Ops Panel</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs rounded-xl placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => navigate(ROUTES.ADMIN)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block"
            >
              Funnel Dashboard
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_LAUNCH)}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors hidden sm:block"
            >
              Launch Checklist
            </button>
            <button
              onClick={() => { load(); loadOpsActions(); }}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { logout(); navigate(ROUTES.ADMIN_LOGIN, { replace: true }); }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Top stats ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Leads',    value: stats.total,       color: 'text-white' },
            { label: 'High Priority',  value: stats.highPriority, color: 'text-red-400' },
            { label: 'Contacted',      value: stats.contacted,    color: 'text-emerald-400' },
            { label: 'Need Follow-up', value: stats.notBooked,    color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Filters + Sort ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Quick filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {QUICK_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setQuickFilter(key)}
                className={`text-xs rounded-xl px-3 py-1.5 border transition-colors ${
                  quickFilter === key
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-slate-300 hover:border-white/[0.15]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-600">Sort:</span>
            {([['priority', 'Priority'], ['score', 'Score'], ['latest', 'Latest']] as [SortKey, string][]).map(([key, label]) => {
              const active = sort === key;
              const Icon = sortDir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`inline-flex items-center gap-1 text-xs rounded-xl px-3 py-1.5 border transition-colors ${
                    active
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-slate-300'
                  }`}
                >
                  {label}
                  {active && <Icon className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Count ── */}
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-xs text-slate-500">
            <span className="text-slate-300 font-semibold">{filtered.length}</span> leads
            {quickFilter !== 'all' && <span className="text-slate-700"> (filtered)</span>}
          </p>
          {actionError && (
            <div className="ml-auto flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {actionError}
              <button onClick={() => setActionError('')} className="ml-1 text-red-400/60 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading leads...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <Search className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">No leads match.</p>
            {(quickFilter !== 'all' || search) && (
              <button
                onClick={() => { setQuickFilter('all'); setSearch(''); }}
                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.candidateCode}
                lead={lead}
                actions={opsActions[lead.candidateCode] ?? { contacted: false, booked: false, notes: [], lastActionAt: null }}
                onContacted={() => markAction(lead, 'contacted')}
                onBooked={() => markAction(lead, 'booked')}
                onNote={() => setNoteModalLead(lead)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Note modal ── */}
      {noteModalLead && (
        <NoteModal
          lead={noteModalLead}
          existingNotes={opsActions[noteModalLead.candidateCode]?.notes ?? []}
          onClose={() => setNoteModalLead(null)}
          onSaved={(action) => {
            handleNoteSaved(action);
          }}
          adminName={adminName}
        />
      )}
    </div>
  );
}
