import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, TrendingUp, Target, ArrowRight,
  Eye, CreditCard, ClipboardList, BarChart2,
  Calendar, MousePointerClick, Info, ChevronLeft,
  ArrowUpRight, Minus, LogOut,
} from 'lucide-react';
import {
  fetchAnalyticsDashboard,
  AnalyticsDashboardData,
  ConversionRates,
  BENCHMARKS,
  EMPTY_METRICS,
  computeConversionRates,
} from '../services/analyticsStore';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function pctColor(val: number, target: number): string {
  if (val === 0) return 'text-slate-600';
  if (val >= target) return 'text-emerald-400';
  if (val >= target * 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function barWidth(val: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.min(100, (val / max) * 100)}%`;
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
}

function MetricCard({ label, value, icon: Icon, iconColor, iconBg, sub }: MetricCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none mb-1 tabular-nums">{formatNum(value)}</p>
      <p className="text-xs text-slate-500 leading-snug">{label}</p>
      {sub && <p className="text-xs text-slate-700 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Conversion rate row ──────────────────────────────────────────────────────

interface ConversionRowProps {
  label: string;
  value: number;
  target: number;
  targetLabel: string;
  note: string;
  fromLabel: string;
  toLabel: string;
}

function ConversionRow({ label, value, target, targetLabel, note, fromLabel, toLabel }: ConversionRowProps) {
  const color = pctColor(value, target);
  const barPct = Math.min(100, (value / Math.max(target, 1)) * 100);
  const isAbove = value >= target;

  return (
    <div className="py-4 border-b border-white/[0.05] last:border-0">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-slate-200">{label}</p>
            {value > 0 && (
              <span className={`text-xs font-bold ${isAbove ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isAbove ? '↑ On target' : '↓ Below target'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">{fromLabel} → {toLabel}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xl font-bold tabular-nums ${color}`}>{value.toFixed(1)}%</p>
          <p className="text-xs text-slate-700">Target: {target}%</p>
        </div>
      </div>

      <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${barPct}%`,
            backgroundColor: value >= target ? '#10b981' : value >= target * 0.6 ? '#f59e0b' : '#ef4444',
          }}
        />
        <div
          className="absolute top-0 h-full w-px bg-white/20"
          style={{ left: '100%' }}
          title={`Target: ${target}%`}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-700 italic">{note}</p>
        <p className="text-xs text-slate-700 font-mono">{targetLabel}</p>
      </div>
    </div>
  );
}

// ─── Funnel bar chart ─────────────────────────────────────────────────────────

interface FunnelStep {
  label: string;
  key: keyof typeof EMPTY_METRICS;
  color: string;
}

const FUNNEL_STEPS: FunnelStep[] = [
  { label: 'Landing Views', key: 'landing_page_view', color: '#3B82F6' },
  { label: 'CTA Clicks', key: 'cta_clicked', color: '#60A5FA' },
  { label: 'Payment Started', key: 'payment_started', color: '#F59E0B' },
  { label: 'Payment Success', key: 'payment_success', color: '#10B981' },
  { label: 'Diagnostic Started', key: 'diagnostic_started', color: '#06B6D4' },
  { label: 'Diagnostic Completed', key: 'diagnostic_completed', color: '#34D399' },
  { label: 'Report Generated', key: 'report_generated', color: '#8B5CF6' },
  { label: 'Report Viewed', key: 'report_viewed', color: '#A78BFA' },
  { label: 'Consultation CTA', key: 'consultation_cta_clicked', color: '#F97316' },
  { label: 'Consultation Booked', key: 'consultation_booked', color: '#22C55E' },
];

function FunnelChart({ metrics }: { metrics: typeof EMPTY_METRICS }) {
  const max = metrics.landing_page_view || 1;

  return (
    <div className="space-y-2">
      {FUNNEL_STEPS.map((step, i) => {
        const val = metrics[step.key];
        const prev = i > 0 ? metrics[FUNNEL_STEPS[i - 1].key] : val;
        const dropPct = prev > 0 && i > 0 ? Math.round((1 - val / prev) * 100) : null;

        return (
          <div key={step.key}>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-slate-500 w-36 shrink-0 truncate">{step.label}</span>
              <div className="flex-1 relative h-7 bg-white/[0.04] rounded-lg overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-lg transition-all duration-700"
                  style={{ width: barWidth(val, max), backgroundColor: step.color, opacity: 0.85 }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-bold text-white tabular-nums">{formatNum(val)}</span>
                </div>
              </div>
              <span className="text-xs tabular-nums text-slate-500 w-12 text-right font-mono">
                {max > 1 ? `${Math.round((val / max) * 100)}%` : '—'}
              </span>
            </div>
            {dropPct !== null && dropPct > 0 && (
              <div className="flex items-center gap-1 ml-36 mb-1">
                <Minus className="w-2.5 h-2.5 text-slate-700" />
                <span className="text-xs text-slate-700">{dropPct}% drop from previous step</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Daily sparkline ──────────────────────────────────────────────────────────

function DailyChart({ data }: { data: AnalyticsDashboardData['daily'] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-700 text-xs">
        No daily data yet
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.landing_page_view), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-full" style={{ height: '80px' }}>
        {data.map((d) => {
          const h = Math.max(4, (d.landing_page_view / maxVal) * 72);
          const bh = Math.max(2, (d.payment_success / maxVal) * 72);
          const ch = Math.max(2, (d.consultation_booked / maxVal) * 72);
          return (
            <div key={d.date} className="flex-1 min-w-[8px] flex items-end gap-px group relative">
              <div
                className="flex-1 bg-blue-500/30 rounded-t-sm group-hover:bg-blue-500/50 transition-colors"
                style={{ height: `${h}px` }}
                title={`${d.date}: ${d.landing_page_view} views`}
              />
              <div
                className="flex-1 bg-emerald-500/50 rounded-t-sm"
                style={{ height: `${bh}px` }}
                title={`${d.date}: ${d.payment_success} payments`}
              />
              <div
                className="flex-1 bg-amber-500/60 rounded-t-sm"
                style={{ height: `${ch}px` }}
                title={`${d.date}: ${d.consultation_booked} bookings`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-slate-700">{data[0]?.date}</span>
        <span className="text-xs text-slate-700">{data[data.length - 1]?.date}</span>
      </div>
      <div className="flex items-center gap-4 mt-2">
        {[
          { color: 'bg-blue-500/40', label: 'Views' },
          { color: 'bg-emerald-500/60', label: 'Payments' },
          { color: 'bg-amber-500/60', label: 'Bookings' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
            <span className="text-xs text-slate-600">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Benchmark card ───────────────────────────────────────────────────────────

function BenchmarkCard({
  benchmarkKey,
  currentValue,
}: {
  benchmarkKey: string;
  currentValue: number;
}) {
  const b = BENCHMARKS[benchmarkKey];
  if (!b) return null;

  const isAbove = currentValue >= b.target;
  const hasData = currentValue > 0;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-slate-400 leading-snug">{b.label}</p>
        {hasData ? (
          isAbove ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-90" />
          )
        ) : null}
      </div>
      <div className="flex items-end gap-2 mb-2">
        <p className={`text-xl font-bold tabular-nums ${hasData ? pctColor(currentValue, b.target) : 'text-slate-700'}`}>
          {hasData ? `${currentValue.toFixed(1)}%` : '—'}
        </p>
        <p className="text-xs text-slate-600 mb-0.5">
          / {b.target}{b.unit} target
        </p>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: hasData ? `${Math.min(100, (currentValue / b.target) * 100)}%` : '0%',
            backgroundColor: hasData
              ? isAbove ? '#10b981' : currentValue >= b.target * 0.6 ? '#f59e0b' : '#ef4444'
              : '#334155',
          }}
        />
      </div>
      <p className="text-xs text-slate-700 italic leading-snug">{b.note}</p>
    </div>
  );
}

// ─── CTA Source breakdown ─────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  header: 'Header Button',
  main_cta: 'Main CTA Block',
  sticky_bar: 'Sticky Bar',
  problem_section: 'Problem Section',
  what_you_get: 'What You Get',
  how_it_works: 'How It Works',
  sample_report: 'Sample Report',
  who_is_it_for: 'Who Is It For',
  why_paid: 'Why Paid Section',
  unknown: 'Unknown',
};

// ─── Main page ────────────────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

const EMPTY_DATA: AnalyticsDashboardData = {
  metrics: { ...EMPTY_METRICS },
  rates: computeConversionRates(EMPTY_METRICS),
  daily: [],
  topCtaSources: [],
  fetchedAt: new Date().toISOString(),
};

export default function FunnelAnalyticsPage() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const [data, setData] = useState<AnalyticsDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAnalyticsDashboard(daysBack);
      setData(result);
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  useEffect(() => { load(); }, [load]);

  const { metrics, rates, daily, topCtaSources } = data;

  const conversionRows: Array<{
    rateKey: keyof ConversionRates;
    label: string;
    from: string;
    to: string;
    benchmarkKey: string;
  }> = [
    {
      rateKey: 'cta_click_rate',
      label: 'CTA Click Rate',
      from: 'Landing Views',
      to: 'CTA Clicks',
      benchmarkKey: 'cta_click_rate',
    },
    {
      rateKey: 'payment_success_rate',
      label: 'Payment Success Rate',
      from: 'Payment Started',
      to: 'Payment Completed',
      benchmarkKey: 'payment_success_rate',
    },
    {
      rateKey: 'diagnostic_completion_rate',
      label: 'Diagnostic Completion Rate',
      from: 'Diagnostic Started',
      to: 'Diagnostic Completed',
      benchmarkKey: 'diagnostic_completion_rate',
    },
    {
      rateKey: 'report_to_consultation_cta_rate',
      label: 'Report → Consultation CTA Rate',
      from: 'Report Viewed',
      to: 'Consultation CTA Clicked',
      benchmarkKey: 'consultation_booking_rate',
    },
    {
      rateKey: 'consultation_booking_rate',
      label: 'Consultation Booking Rate',
      from: 'Consultation CTA Clicked',
      to: 'Consultation Booked',
      benchmarkKey: 'consultation_booking_rate',
    },
    {
      rateKey: 'overall_landing_to_booking_rate',
      label: 'Overall: Landing → Booking',
      from: 'Landing Views',
      to: 'Consultation Booked',
      benchmarkKey: 'landing_page_conversion',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* ── Header ── */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.ADMIN)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Admin
            </button>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-white">Funnel Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDaysBack(opt.value)}
                  className={[
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    daysBack === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page title ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">₹199 Diagnostic Funnel Analytics</h1>
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Info className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">Internal only</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Tracks all 12 funnel events from landing page view to consultation booked.
            Future: connect to GA4, Mixpanel, or Meta Pixel via <code className="text-slate-400 bg-white/5 px-1 rounded">analyticsService.ts</code>.
          </p>
        </div>

        {/* ── Metric grid ── */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Funnel Volume</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <MetricCard label="Landing Views" value={metrics.landing_page_view} icon={Eye} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
            <MetricCard label="CTA Clicks" value={metrics.cta_clicked} icon={MousePointerClick} iconColor="text-cyan-400" iconBg="bg-cyan-500/10" />
            <MetricCard label="Payments Started" value={metrics.payment_started} icon={CreditCard} iconColor="text-amber-400" iconBg="bg-amber-500/10" />
            <MetricCard label="Payments Completed" value={metrics.payment_success} icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
            <MetricCard label="Diagnostics Completed" value={metrics.diagnostic_completed} icon={ClipboardList} iconColor="text-sky-400" iconBg="bg-sky-500/10" />
            <MetricCard label="Reports Generated" value={metrics.report_generated} icon={BarChart2} iconColor="text-violet-400" iconBg="bg-violet-500/10" />
            <MetricCard label="Reports Viewed" value={metrics.report_viewed} icon={Eye} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
            <MetricCard label="Consult CTA Clicks" value={metrics.consultation_cta_clicked} icon={Target} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
            <MetricCard label="Consultations Booked" value={metrics.consultation_booked} icon={Calendar} iconColor="text-green-400" iconBg="bg-green-500/10" />
          </div>
        </div>

        {/* ── Funnel chart + daily ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Funnel waterfall */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-sm font-semibold text-white mb-1">Funnel Waterfall</p>
            <p className="text-xs text-slate-600 mb-5">Each bar shows volume as % of landing page views</p>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <FunnelChart metrics={metrics} />
            )}
          </div>

          {/* Daily chart */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-sm font-semibold text-white mb-1">Daily Activity</p>
            <p className="text-xs text-slate-600 mb-5">Last {daysBack} days — views, payments, bookings</p>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <DailyChart data={daily} />
            )}
          </div>
        </div>

        {/* ── Conversion rates ── */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
          <p className="text-sm font-semibold text-white mb-1">Conversion Rates</p>
          <p className="text-xs text-slate-600 mb-5">
            Step-by-step funnel efficiency — compare against benchmark targets
          </p>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            conversionRows.map((row) => (
              <ConversionRow
                key={row.rateKey}
                label={row.label}
                value={rates[row.rateKey]}
                target={BENCHMARKS[row.benchmarkKey]?.target ?? 10}
                targetLabel={`${BENCHMARKS[row.benchmarkKey]?.target ?? '—'}% target`}
                note={BENCHMARKS[row.benchmarkKey]?.note ?? ''}
                fromLabel={row.from}
                toLabel={row.to}
              />
            ))
          )}
        </div>

        {/* ── Benchmark grid ── */}
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Benchmark Targets
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <BenchmarkCard benchmarkKey="cta_click_rate" currentValue={rates.cta_click_rate} />
            <BenchmarkCard benchmarkKey="payment_success_rate" currentValue={rates.payment_success_rate} />
            <BenchmarkCard benchmarkKey="diagnostic_completion_rate" currentValue={rates.diagnostic_completion_rate} />
            <BenchmarkCard benchmarkKey="consultation_booking_rate" currentValue={rates.consultation_booking_rate} />
            <BenchmarkCard benchmarkKey="landing_page_conversion" currentValue={rates.overall_landing_to_booking_rate} />
          </div>
        </div>

        {/* ── CTA source breakdown ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* CTA sources */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-sm font-semibold text-white mb-1">CTA Click Sources</p>
            <p className="text-xs text-slate-600 mb-5">Which landing page sections drive the most CTA clicks</p>
            {topCtaSources.length === 0 ? (
              <p className="text-xs text-slate-700 text-center py-6">No CTA data yet</p>
            ) : (
              <div className="space-y-3">
                {topCtaSources.map((s) => {
                  const maxCount = topCtaSources[0].count;
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">
                          {SOURCE_LABELS[s.source] ?? s.source}
                        </span>
                        <span className="text-xs font-bold text-white tabular-nums">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500/70 transition-all duration-700"
                          style={{ width: barWidth(s.count, maxCount) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Future integration readiness */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-sm font-semibold text-white mb-1">Integration Readiness</p>
            <p className="text-xs text-slate-600 mb-4">
              Adapters stubbed in <code className="text-slate-400 bg-white/5 px-1 rounded">analyticsService.ts</code>
            </p>
            <div className="space-y-3">
              {[
                {
                  label: 'GA4 (Google Analytics 4)',
                  status: 'ready to connect',
                  note: 'Add gtag script to index.html with Measurement ID',
                  color: 'text-amber-400 bg-amber-500/10',
                },
                {
                  label: 'Meta Pixel',
                  status: 'ready to connect',
                  note: 'Add Pixel base code · Purchase, Lead, ViewContent mapped',
                  color: 'text-amber-400 bg-amber-500/10',
                },
                {
                  label: 'Mixpanel',
                  status: 'ready to connect',
                  note: 'npm install mixpanel-browser · Call mixpanel.init(TOKEN)',
                  color: 'text-amber-400 bg-amber-500/10',
                },
                {
                  label: 'Supabase (analytics_events)',
                  status: 'active',
                  note: 'All 12 events persisted · 30/90 day query support',
                  color: 'text-emerald-400 bg-emerald-500/10',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${item.color}`}>
                    {item.status}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                    <p className="text-xs text-slate-600">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <p className="text-xs font-semibold text-slate-500">To activate an integration:</p>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Add the platform script tag, initialize it, and the <code className="text-slate-500 bg-white/5 px-1 rounded">forwardTo*()</code> adapter in analyticsService.ts will automatically forward events on every <code className="text-slate-500 bg-white/5 px-1 rounded">track()</code> call.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-700 text-center pb-4">
          QualScore Analytics · Internal only · Data sourced from Supabase analytics_events table
        </p>
      </div>
    </div>
  );
}
