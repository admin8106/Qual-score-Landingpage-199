import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, ExternalLink, FileText, RefreshCw, Mail, X } from 'lucide-react';

const SUPPORT_EMAIL = 'support@qualscore.in';
import { useFlow } from '../context/FlowContext';
import { ROUTES } from '../constants/routes';
import { reportsApi, type DiagnosticReport, type ReportStatus } from '../api/services/reports';
import { Analytics } from '../services/analyticsService';
import { getBandConfig } from '../utils/reportInsights';
import ScoreGauge from '../components/report/ScoreGauge';
import DimensionTable from '../components/report/DimensionTable';
import ReportSection from '../components/report/ReportSection';
import GapCard from '../components/report/GapCard';
import CtaBlock from '../components/report/CtaBlock';

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS  = 4_000;
const MAX_POLL_ATTEMPTS = 20;
const TERMINAL_STATUSES: ReportStatus[] = ['COMPLETED', 'GENERATED', 'GENERATED_AI', 'GENERATED_FALLBACK', 'RULE_BASED', 'FAILED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTerminal(status: ReportStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function isReady(status: ReportStatus): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'GENERATED' ||
    status === 'GENERATED_AI' ||
    status === 'GENERATED_FALLBACK' ||
    status === 'RULE_BASED'
  );
}

function parseBandLabel(label: string): { band: 'critical' | 'needs_optimization' | 'strong'; display: string } {
  const l = (label ?? '').toLowerCase();
  if (l.includes('critical') || l.includes('not competitive')) {
    return { band: 'critical', display: label || 'Not Competitive' };
  }
  if (l.includes('needs') || l.includes('optimization')) {
    return { band: 'needs_optimization', display: label || 'Needs Optimization' };
  }
  return { band: 'strong', display: label || 'Strong' };
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Preparing Your Report</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// ─── Error / empty states ─────────────────────────────────────────────────────

type ErrorKind = 'not_found' | 'still_generating' | 'unavailable' | 'malformed';

function ErrorState({
  kind,
  onRetry,
  onStart,
}: {
  kind: ErrorKind;
  onRetry: () => void;
  onStart: () => void;
}) {
  const configs: Record<ErrorKind, { title: string; body: string; cta: string; action: () => void }> = {
    not_found: {
      title: 'Report Not Found',
      body: 'We could not find your diagnostic report. Complete the full diagnostic flow to generate one.',
      cta: 'Start Diagnostic',
      action: onStart,
    },
    still_generating: {
      title: 'Report Still Generating',
      body: 'Your report is being generated. This usually takes less than a minute. Try refreshing in a moment.',
      cta: 'Refresh',
      action: onRetry,
    },
    unavailable: {
      title: 'Temporarily Unavailable',
      body: 'We could not load your report right now. Your data is safe — please try again.',
      cta: 'Try Again',
      action: onRetry,
    },
    malformed: {
      title: 'Report Could Not Be Displayed',
      body: 'Your report was generated but could not be rendered correctly. Please try again.',
      cta: 'Retry',
      action: onRetry,
    },
  };

  const cfg = configs[kind];

  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <FileText className="w-7 h-7 text-slate-500" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">{cfg.title}</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{cfg.body}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={cfg.action}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {cfg.cta}
          </button>
          {kind !== 'not_found' && (
            <button
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm px-5 py-2.5 rounded-xl border border-white/10 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Still having trouble?{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Report+not+loading`}
            className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Sticky mobile CTA ────────────────────────────────────────────────────────

function StickyMobileCta({ onBook }: { onBook: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0A0F1E]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 transition-transform duration-500',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <button
        onClick={onBook}
        className="w-full flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
      >
        Book Detailed Evaluation
      </button>
    </div>
  );
}

// ─── Report body ──────────────────────────────────────────────────────────────

function ReportBody({
  report,
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateRole,
  candidateYears,
  candidateIndustry,
  reportId,
  onBook,
}: {
  report: DiagnosticReport;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateRole: string;
  candidateYears?: string;
  candidateIndustry?: string;
  reportId: string;
  onBook: (source: string) => void;
}) {
  const scoreSummary  = report.scoreSummary!;
  const score         = Number(scoreSummary.employabilityScore) || 0;
  const { display: bandDisplay, band } = parseBandLabel(scoreSummary.bandLabel);
  const bandConfig    = getBandConfig(band, score);
  const [commsBannerDismissed, setCommsBannerDismissed] = useState(false);

  const generatedAt = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#080C18]">
      {/* ── Header bar ── */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">QualScore</span>
            <span className="hidden sm:inline text-xs text-slate-500">Employability Diagnostic Report</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title="Download report"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title="Share report"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={() => onBook('report_header_cta')}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Book Evaluation
            </button>
          </div>
        </div>
      </div>

      {/* ── Comms confirmation banner (dismissible) ── */}
      {(candidatePhone || candidateEmail) && !commsBannerDismissed && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-blue-500/[0.05] border border-blue-500/[0.12] rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-300 mb-1">Report notifications queued</p>
                <div className="space-y-1">
                  {candidatePhone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 shrink-0 text-center leading-none text-[10px] font-bold text-emerald-400">WA</span>
                      <span>WhatsApp notification to <span className="text-slate-300">{candidatePhone}</span></span>
                    </div>
                  )}
                  {candidateEmail && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>Email notification to <span className="text-slate-300">{candidateEmail}</span></span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">Delivery confirmation may take a few minutes depending on your provider.</p>
              </div>
              <button
                onClick={() => setCommsBannerDismissed(true)}
                className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-28 sm:pb-12 space-y-4">

        {/* ── Meta ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            {generatedAt && (
              <p className="text-xs text-slate-500 mb-1">Generated {generatedAt}</p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {report.reportTitle || candidateName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {candidateRole}
              {candidateYears && ` · ${candidateYears} yrs experience`}
              {candidateIndustry && ` · ${candidateIndustry}`}
            </p>
          </div>
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-xs text-slate-600">Report ID</p>
            <p className="text-xs font-mono text-slate-500">{reportId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* 1. Score Summary */}
        <ReportSection label="Score Summary" accent={bandConfig.ringColor}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="shrink-0">
              <ScoreGauge
                score={score}
                bandLabel={bandDisplay}
                config={bandConfig}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base text-slate-300 leading-relaxed mb-6">
                {scoreSummary.tagline || bandConfig.scoreSummary}
              </p>

              {report.dimensionBreakdown && report.dimensionBreakdown.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {report.dimensionBreakdown.slice(0, 5).map((dim) => {
                    const s     = Number(dim.score);
                    const pct   = Math.min(100, Math.max(0, (s / 10) * 100));
                    const color = s >= 7 ? '#10b981' : s >= 5 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={dim.area}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 truncate max-w-[100px]">{dim.area}</span>
                          <span className="font-medium tabular-nums" style={{ color }}>{s.toFixed(1)}</span>
                        </div>
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ReportSection>

        {/* 2. LinkedIn Insight */}
        {report.linkedinInsight && (
          <ReportSection label="LinkedIn Insight" accent="#3B82F6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-300 leading-relaxed text-sm">{report.linkedinInsight}</p>
              </div>
            </div>
          </ReportSection>
        )}

        {/* 3. Behavioral Insight */}
        {report.behavioralInsight && (
          <ReportSection label="Behavioral Insight" accent="#8B5CF6">
            <p className="text-slate-300 leading-relaxed text-sm">{report.behavioralInsight}</p>
          </ReportSection>
        )}

        {/* 4. Dimension Breakdown */}
        {report.dimensionBreakdown && report.dimensionBreakdown.length > 0 && (
          <ReportSection label="Dimension Breakdown" accent="#06B6D4">
            <DimensionTable
              rows={report.dimensionBreakdown.map((d) => ({
                label: d.area,
                score: d.score,
                status: d.status,
                remark: d.remark,
              }))}
            />
          </ReportSection>
        )}

        {/* 5. Top Gaps */}
        {report.topGaps && report.topGaps.length > 0 && (
          <ReportSection label="Top Gaps Identified" accent="#EF4444">
            <div className="space-y-3">
              {report.topGaps.map((gap, i) => (
                <GapCard key={i} gap={gap} index={i} />
              ))}
            </div>
          </ReportSection>
        )}

        {/* 6. Risk Projection */}
        {report.riskProjection && (
          <ReportSection label="Risk Projection" accent="#F59E0B">
            <div className="flex gap-4">
              <div className="shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-slate-300 leading-relaxed text-sm">{report.riskProjection}</p>
            </div>
          </ReportSection>
        )}

        {/* 7. Recruiter View */}
        {report.recruiterViewInsight && (
          <ReportSection label="Recruiter View" accent="#64748B">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
                How a recruiter likely perceives your profile today
              </p>
              <p className="text-slate-300 leading-relaxed text-sm italic">"{report.recruiterViewInsight}"</p>
            </div>
          </ReportSection>
        )}

        {/* 8. Recommendation */}
        {report.recommendation && (
          <ReportSection label="Recommendation" accent="#10B981">
            <p className="text-slate-300 leading-relaxed text-sm">{report.recommendation}</p>
          </ReportSection>
        )}

        {/* 9. CTA */}
        <CtaBlock
          band={band}
          config={
            report.ctaBlock?.headline
              ? {
                  ...bandConfig,
                  ctaHeadline: report.ctaBlock.headline,
                  ctaBody: report.ctaBlock.body || bandConfig.ctaBody,
                }
              : bandConfig
          }
          onBook={() => onBook('report_cta_block')}
        />

        <p className="text-center text-xs text-slate-700 pt-2 pb-2">
          This diagnostic report is for personal use only and does not constitute a job guarantee.
          {' '}Report ID: {reportId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <StickyMobileCta onBook={() => onBook('sticky_mobile_cta')} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const navigate = useNavigate();
  const { state } = useFlow();

  const [report, setReport]         = useState<DiagnosticReport | null>(null);
  const [loadState, setLoadState]   = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorKind, setErrorKind]   = useState<ErrorKind>('unavailable');
  const [loadMessage, setLoadMessage] = useState('Fetching your report...');

  const pollCountRef  = useRef(0);
  const pollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef    = useRef(true);
  const topRef        = useRef<HTMLDivElement>(null);

  const candidateCode = state.candidateCode ?? '';
  const candidate     = state.candidateDetails;

  const handleBook = useCallback((source = 'report_cta') => {
    Analytics.consultationCtaClicked(source, candidateCode);
    navigate(ROUTES.BOOKING);
  }, [navigate, candidateCode]);

  const handleStart = useCallback(() => {
    navigate(ROUTES.LANDING);
  }, [navigate]);

  const fetchReport = useCallback(async (code: string) => {
    if (!code) {
      setErrorKind('not_found');
      setLoadState('error');
      return;
    }

    const result = await reportsApi.getReport(code);

    if (!mountedRef.current) return;

    if (!result.ok) {
      if (result.error.code === 'NOT_FOUND') {
        setErrorKind('not_found');
      } else {
        setErrorKind('unavailable');
      }
      setLoadState('error');
      return;
    }

    const data = result.data;

    if (data.reportStatus === 'FAILED') {
      setErrorKind('unavailable');
      setLoadState('error');
      return;
    }

    if (!isTerminal(data.reportStatus)) {
      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setErrorKind('still_generating');
        setLoadState('error');
        return;
      }
      pollCountRef.current += 1;
      setLoadMessage('Report is being generated — checking again shortly...');
      pollTimerRef.current = setTimeout(() => fetchReport(code), POLL_INTERVAL_MS);
      return;
    }

    if (!isReady(data.reportStatus)) {
      setErrorKind('unavailable');
      setLoadState('error');
      return;
    }

    if (!data.scoreSummary) {
      setErrorKind('malformed');
      setLoadState('error');
      return;
    }

    setReport(data);
    setLoadState('ready');

    const score = data.scoreSummary?.employabilityScore ?? 0;
    const { band } = parseBandLabel(data.scoreSummary?.bandLabel ?? '');
    Analytics.reportGeneratedViewed(code, score, band);
    Analytics.reportViewed(code);
  }, []);

  const handleRetry = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollCountRef.current = 0;
    setLoadState('loading');
    setLoadMessage('Fetching your report...');
    fetchReport(candidateCode);
  }, [candidateCode, fetchReport]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loadState]);

  useEffect(() => {
    mountedRef.current = true;
    if (!candidateCode) {
      setErrorKind('not_found');
      setLoadState('error');
      return () => { mountedRef.current = false; };
    }
    fetchReport(candidateCode);
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [candidateCode, fetchReport]);

  const reportId = candidateCode || state.sessionId || 'UNKNOWN';

  return (
    <div ref={topRef}>
      {loadState === 'loading' && <LoadingState message={loadMessage} />}
      {loadState === 'error'   && (
        <ErrorState
          kind={errorKind}
          onRetry={handleRetry}
          onStart={handleStart}
        />
      )}
      {loadState === 'ready' && report && (
        <ReportBody
          report={report}
          candidateName={candidate?.name ?? report.candidateCode}
          candidateEmail={candidate?.email}
          candidatePhone={candidate?.phone}
          candidateRole={candidate?.jobRole ?? ''}
          candidateYears={candidate?.yearsExperience}
          candidateIndustry={candidate?.industry}
          reportId={reportId}
          onBook={handleBook}
        />
      )}
    </div>
  );
}
