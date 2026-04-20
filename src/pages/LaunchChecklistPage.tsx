import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  Lock, Unlock, LogOut, ChevronDown, ChevronUp, Send,
  Shield, Zap, BarChart2, MessageSquare, CreditCard,
  Users, Calendar, AlertCircle, Smartphone, Activity,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = 'pending' | 'verified' | 'failed';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  description: string;
  howToVerify: string;
  blocking: boolean;
  status: CheckStatus;
  verified_by?: string | null;
  note?: string | null;
  verified_at?: string | null;
  updated_at?: string;
}

interface DbRow {
  id: string;
  label: string;
  category: string;
  status: string;
  verified_by: string | null;
  note: string | null;
  verified_at: string | null;
  updated_at: string;
}

// ─── Static checklist definition ──────────────────────────────────────────────

const CHECKLIST_DEFINITION: Omit<ChecklistItem, 'status' | 'verified_by' | 'note' | 'verified_at' | 'updated_at'>[] = [
  {
    id: 'payment_real_test',
    label: 'Payment working (real test)',
    category: 'payment',
    description: 'A real ₹199 payment has been completed end-to-end using a live Razorpay key — not a mock or test mode transaction.',
    howToVerify: 'Use a real card in production mode. Confirm the transaction appears in Razorpay dashboard. Confirm payment_status = "completed" in the database. Refund the test transaction after.',
    blocking: true,
  },
  {
    id: 'ai_report_working',
    label: 'AI report working (or fallback active)',
    category: 'ai',
    description: 'The AI report generation pipeline produces a valid report. If AI is unavailable, the rule-based fallback generates a complete report without error.',
    howToVerify: 'Complete a full diagnostic flow. Confirm a report is generated on the /report page. Check diagnostic_reports table for status = COMPLETED or RULE_BASED. Verify fallbackReportOnly op flag behaviour separately.',
    blocking: true,
  },
  {
    id: 'whatsapp_email_working',
    label: 'WhatsApp / email notifications working',
    category: 'communication',
    description: 'After a diagnostic is completed, the candidate receives a WhatsApp message (if configured) and/or a confirmation email. At minimum one channel must be active.',
    howToVerify: 'Complete a test flow with your own phone/email. Confirm delivery in the communication_events table. Verify delivery_status = "delivered" or "sent".',
    blocking: false,
  },
  {
    id: 'lead_capture_working',
    label: 'Lead capture working (early + full)',
    category: 'analytics',
    description: 'Leads are captured in early_leads at CTA click and in candidate_profiles after profile submission. No leads are silently dropped.',
    howToVerify: 'Click CTA on landing page. Check early_leads table for a new row. Complete checkout + profile form. Confirm candidate_profiles row exists with correct data.',
    blocking: true,
  },
  {
    id: 'admin_dashboard_visible',
    label: 'Admin dashboard accessible',
    category: 'admin',
    description: 'The admin funnel dashboard (/admin), ops panel (/admin/ops), and analytics (/admin/analytics) are all accessible and loading data correctly.',
    howToVerify: 'Log in to admin. Visit each admin route. Confirm leads appear in the table. Confirm funnel stats render. Confirm ops panel shows lead cards.',
    blocking: true,
  },
  {
    id: 'analytics_tracking_working',
    label: 'Analytics tracking working',
    category: 'analytics',
    description: 'Key funnel events (landing_page_view, cta_clicked, payment_success, report_generated) are being recorded in the analytics_events table.',
    howToVerify: 'Run through the full user flow. Query: SELECT event_name, COUNT(*) FROM analytics_events GROUP BY event_name. Confirm all expected events appear.',
    blocking: false,
  },
  {
    id: 'consultation_booking_working',
    label: 'Consultation booking working',
    category: 'booking',
    description: 'After viewing the report, candidates can successfully book a consultation. The booking is recorded in consultation_bookings and visible in the admin panel.',
    howToVerify: 'Complete a full flow through to /booking. Submit the booking form. Confirm consultation_bookings row in DB. Confirm consultationBooked = true on the lead in admin.',
    blocking: false,
  },
  {
    id: 'error_states_tested',
    label: 'Error states tested',
    category: 'resilience',
    description: 'Payment failure, AI report failure, network drop during diagnostic, and invalid/expired session states all show appropriate error screens — not blank pages or unhandled crashes.',
    howToVerify: 'Test: (1) Cancel Razorpay modal. (2) Enable fallbackReportOnly op flag and verify graceful degradation. (3) Navigate directly to /report without completing flow. (4) Kill network mid-diagnostic.',
    blocking: true,
  },
  {
    id: 'refresh_recovery_tested',
    label: 'Refresh / recovery tested',
    category: 'resilience',
    description: 'A user who refreshes the page at any step in the funnel is correctly redirected or recovered to the right state — not sent back to the landing page or shown a broken screen.',
    howToVerify: 'After payment: refresh /details — should stay. After profile: refresh /diagnostic — should stay. After diagnostic: refresh /report — should reload report. After each refresh confirm the correct page loads.',
    blocking: true,
  },
  {
    id: 'mobile_flow_tested',
    label: 'Mobile flow tested end-to-end',
    category: 'ux',
    description: 'The full user journey — landing → checkout → form → diagnostic → report → booking — works correctly on a real mobile device (not just a browser resize).',
    howToVerify: 'Test on an actual Android or iOS device. Use mobile Chrome or Safari. Complete the full flow. Verify all buttons are tappable, forms are fillable, and the report renders correctly.',
    blocking: true,
  },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  payment:       { label: 'Payment',       icon: CreditCard,    color: 'text-emerald-400' },
  ai:            { label: 'AI / Report',   icon: Zap,           color: 'text-blue-400'    },
  communication: { label: 'Comms',         icon: MessageSquare, color: 'text-amber-400'   },
  analytics:     { label: 'Analytics',     icon: BarChart2,     color: 'text-blue-400'    },
  admin:         { label: 'Admin Panel',   icon: Users,         color: 'text-slate-300'   },
  booking:       { label: 'Booking',       icon: Calendar,      color: 'text-amber-400'   },
  resilience:    { label: 'Resilience',    icon: Shield,        color: 'text-red-400'     },
  ux:            { label: 'Mobile / UX',   icon: Smartphone,    color: 'text-emerald-400' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mergeWithDb(defs: typeof CHECKLIST_DEFINITION, dbRows: DbRow[]): ChecklistItem[] {
  const rowMap: Record<string, DbRow> = {};
  for (const row of dbRows) rowMap[row.id] = row;
  return defs.map((def) => {
    const row = rowMap[def.id];
    return {
      ...def,
      status: (row?.status as CheckStatus) ?? 'pending',
      verified_by: row?.verified_by ?? null,
      note: row?.note ?? null,
      verified_at: row?.verified_at ?? null,
      updated_at: row?.updated_at,
    };
  });
}

// ─── Verify modal ─────────────────────────────────────────────────────────────

function VerifyModal({
  item,
  adminName,
  onClose,
  onSave,
}: {
  item: ChecklistItem;
  adminName: string;
  onClose: () => void;
  onSave: (id: string, status: CheckStatus, note: string) => Promise<void>;
}) {
  const [status, setStatus]   = useState<CheckStatus>(item.status === 'pending' ? 'verified' : item.status);
  const [note, setNote]       = useState(item.note ?? '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, status, note);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D1120] border border-white/[0.10] rounded-2xl overflow-hidden shadow-2xl">

        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.08]">
          <div>
            <p className="text-sm font-bold text-white">{item.label}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors ml-4 shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">How to verify</p>
          <p className="text-xs text-slate-400 leading-relaxed">{item.howToVerify}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Mark as</p>
            <div className="flex gap-2">
              {(['verified', 'failed', 'pending'] as CheckStatus[]).map((s) => {
                const active = status === s;
                const cls = {
                  verified: active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-emerald-400',
                  failed:   active ? 'bg-red-500/20 text-red-300 border-red-500/40'             : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-red-400',
                  pending:  active ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'       : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-slate-300',
                }[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 text-xs font-semibold py-2.5 rounded-xl border transition-colors capitalize ${cls}`}
                  >
                    {s === 'verified' ? 'Verified' : s === 'failed' ? 'Failed / Issue' : 'Reset to Pending'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {status === 'failed' ? 'Describe the issue (required)' : 'Verification note (optional)'}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={status === 'failed' ? 'What broke? What error did you see?' : 'e.g. Tested on 29 Mar with real Razorpay key, txn ID rzp_xxx'}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-700">Verified by: <span className="text-slate-500">{adminName}</span></p>
            <button
              onClick={handleSave}
              disabled={saving || (status === 'failed' && !note.trim())}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-5 py-2.5 transition-colors"
            >
              {saving
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : <><Send className="w-3.5 h-3.5" />Save</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single checklist row ─────────────────────────────────────────────────────

function CheckRow({
  item,
  expanded,
  onToggleExpand,
  onVerify,
}: {
  item: ChecklistItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onVerify: () => void;
}) {
  const statusIcon = {
    verified: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    failed:   <XCircle    className="w-5 h-5 text-red-400 shrink-0"     />,
    pending:  <Clock      className="w-5 h-5 text-slate-600 shrink-0"   />,
  }[item.status];

  const rowBorder = {
    verified: 'border-emerald-500/10',
    failed:   'border-red-500/20',
    pending:  'border-white/[0.07]',
  }[item.status];

  const catMeta = CATEGORY_META[item.category];
  const CatIcon = catMeta?.icon ?? Activity;

  return (
    <div className={`border ${rowBorder} rounded-2xl overflow-hidden transition-colors hover:border-white/[0.12]`}>
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="mt-0.5">{statusIcon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className={`text-sm font-semibold ${item.status === 'verified' ? 'text-slate-300' : 'text-white'}`}>
              {item.label}
            </p>
            {item.blocking && item.status !== 'verified' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                Blocking
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${catMeta?.color ?? 'text-slate-500'}`}>
              <CatIcon className="w-3 h-3" />
              {catMeta?.label ?? item.category}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed line-clamp-1">{item.description}</p>

          {item.status !== 'pending' && item.verified_by && (
            <p className="text-xs text-slate-700 mt-1">
              {item.status === 'verified' ? 'Verified' : 'Flagged'} by {item.verified_by}
              {item.verified_at ? ` · ${timeAgo(item.verified_at)}` : ''}
            </p>
          )}
          {item.note && (
            <p className={`text-xs mt-1 italic leading-snug ${item.status === 'failed' ? 'text-red-400/80' : 'text-slate-600'}`}>
              "{item.note}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onVerify(); }}
            className={`text-xs font-semibold rounded-xl px-3 py-1.5 border transition-colors ${
              item.status === 'verified'
                ? 'bg-white/[0.03] text-slate-600 border-white/[0.06] hover:text-slate-300'
                : 'bg-blue-600/80 hover:bg-blue-500 text-white border-transparent'
            }`}
          >
            {item.status === 'verified' ? 'Re-verify' : 'Verify'}
          </button>
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-slate-600" />
            : <ChevronDown className="w-4 h-4 text-slate-600" />
          }
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-white/[0.06] bg-white/[0.02] space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">What this checks</p>
            <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">How to verify</p>
            <p className="text-xs text-slate-400 leading-relaxed">{item.howToVerify}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ad-lock gate ─────────────────────────────────────────────────────────────

function AdsGateBanner({ items }: { items: ChecklistItem[] }) {
  const blockingItems = items.filter((i) => i.blocking);
  const allBlockingDone = blockingItems.every((i) => i.status === 'verified');
  const anyFailed = items.some((i) => i.status === 'failed');
  const totalVerified = items.filter((i) => i.status === 'verified').length;
  const pct = Math.round((totalVerified / items.length) * 100);

  if (allBlockingDone && !anyFailed) {
    return (
      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl px-6 py-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Unlock className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-emerald-300">Launch gate: CLEARED</p>
          <p className="text-sm text-emerald-500/80 mt-0.5">
            All {blockingItems.length} blocking checks are verified. You may proceed with paid ads and external traffic.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-emerald-400">{pct}%</p>
          <p className="text-xs text-emerald-600">complete</p>
        </div>
      </div>
    );
  }

  const remainingBlocking = blockingItems.filter((i) => i.status !== 'verified');

  return (
    <div className="border border-red-500/30 bg-red-500/5 rounded-2xl px-6 py-5 flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <Lock className="w-6 h-6 text-red-400" />
      </div>
      <div className="flex-1">
        <p className="text-base font-bold text-red-400">DO NOT launch ads yet</p>
        <p className="text-sm text-red-500/80 mt-0.5">
          {remainingBlocking.length} blocking check{remainingBlocking.length !== 1 ? 's' : ''} remain unverified.
          Running paid traffic before these are cleared risks wasted spend and failed conversions.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {remainingBlocking.map((i) => (
            <span key={i.id} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1">
              {i.label}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-2xl font-bold text-red-400">{pct}%</p>
        <p className="text-xs text-red-600">complete</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LaunchChecklistPage() {
  const navigate = useNavigate();
  const { token, profile, logout } = useAdminAuth();

  const [items, setItems]         = useState<ChecklistItem[]>(
    mergeWithDb(CHECKLIST_DEFINITION, [])
  );
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifyingItem, setVerifyingItem] = useState<ChecklistItem | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const adminName = profile?.fullName || profile?.email || 'admin';

  const loadFromDb = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('launch_checklist_items')
      .select('id, label, category, status, verified_by, note, verified_at, updated_at');
    setItems(mergeWithDb(CHECKLIST_DEFINITION, (data as DbRow[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  const handleSave = useCallback(async (
    id: string,
    status: CheckStatus,
    note: string,
  ) => {
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      id,
      label: CHECKLIST_DEFINITION.find((d) => d.id === id)?.label ?? '',
      category: CHECKLIST_DEFINITION.find((d) => d.id === id)?.category ?? '',
      status,
      verified_by: adminName,
      note: note || null,
      verified_at: status !== 'pending' ? now : null,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from('launch_checklist_items')
      .upsert(payload, { onConflict: 'id' });

    if (upsertError) {
      setSaveError('Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    setSaveError(null);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, verified_by: adminName, note: note || null, verified_at: status !== 'pending' ? now : null }
          : item
      )
    );
    setLastSaved(now);
    setSaving(false);
  }, [adminName]);

  const verified  = items.filter((i) => i.status === 'verified').length;
  const failed    = items.filter((i) => i.status === 'failed').length;
  const pending   = items.filter((i) => i.status === 'pending').length;
  const blocking  = items.filter((i) => i.blocking && i.status !== 'verified').length;

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A0F1E]/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">Launch Checklist</span>
            <span className="text-[10px] text-slate-600 hidden sm:inline uppercase tracking-wider font-medium">
              · Internal use only
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(ROUTES.ADMIN)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_OPS)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block"
            >
              Ops Panel
            </button>
            <button
              onClick={loadFromDb}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Title ── */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Pre-Launch Verification Checklist</h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Every item below must be personally verified before running paid ads or sending traffic.
            Blocking items will prevent the launch gate from clearing. Mark each item as verified after testing.
          </p>
          {saveError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 mt-2 inline-block">{saveError}</p>
          )}
          {!saveError && lastSaved && (
            <p className="text-xs text-slate-700 mt-2">Last saved {timeAgo(lastSaved)}</p>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Progress</p>
            <p className="text-sm font-bold text-white">{verified} / {items.length} verified</p>
          </div>
          <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(verified / items.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{verified}</p>
              <p className="text-xs text-slate-600">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{failed}</p>
              <p className="text-xs text-slate-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-500">{pending}</p>
              <p className="text-xs text-slate-600">Pending</p>
            </div>
          </div>
          {blocking > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400 font-medium">
                {blocking} blocking item{blocking !== 1 ? 's' : ''} must be verified before you can launch
              </p>
            </div>
          )}
        </div>

        {/* ── Ads gate ── */}
        <AdsGateBanner items={items} />

        {/* ── Checklist ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading checklist...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs text-slate-500">
                <span className="text-red-400 font-semibold">Red "Blocking" items</span> must be verified before any paid ads.
                Other items are recommended but not strictly required for launch.
              </p>
            </div>
            {items.map((item) => (
              <CheckRow
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onVerify={() => setVerifyingItem(item)}
              />
            ))}
          </div>
        )}

        {/* ── Footer note ── */}
        <div className="border border-white/[0.05] rounded-xl px-5 py-4 bg-white/[0.02]">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-500">Checklist policy:</span> This list must be re-verified
            after any major deployment, backend config change, or payment gateway key rotation.
            Each verification is logged with the verifier's name and timestamp.
            Do not approve paid ad campaigns unless all blocking items are green.
          </p>
        </div>
      </div>

      {/* ── Verify modal ── */}
      {verifyingItem && (
        <VerifyModal
          item={verifyingItem}
          adminName={adminName}
          onClose={() => setVerifyingItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
