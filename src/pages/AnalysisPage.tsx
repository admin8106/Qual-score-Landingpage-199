import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlow } from '../context/FlowContext';
import { diagnosticApi, type AnalysisStatus } from '../api/services/diagnostic';
import { Analytics } from '../services/analyticsService';
import { LeadCapture } from '../services/leadCaptureService';
import { ROUTES } from '../constants/routes';

const SUPPORT_EMAIL = 'support@qualscore.in';

// ─── Stage definitions ────────────────────────────────────────────────────────
//
// Each stage has a backend status that "unlocks" it, plus a display duration
// used to drive the UI animation independently from the actual network call.
// This decouples UX pacing from backend latency while remaining truthful.

interface Stage {
  id: string;
  label: string;
  sublabel: string;
  backendStatus: AnalysisStatus | null;
  minDuration: number;
}

const STAGES: Stage[] = [
  {
    id: 'inputs',
    label: 'Preparing your inputs',
    sublabel: 'Verifying payment, profile, and diagnostic responses',
    backendStatus: 'INITIATED',
    minDuration: 900,
  },
  {
    id: 'scoring',
    label: 'Analyzing employability signals',
    sublabel: 'Applying weighted scoring across 5 key dimensions',
    backendStatus: 'SCORING',
    minDuration: 1400,
  },
  {
    id: 'linkedin',
    label: 'Reviewing LinkedIn positioning',
    sublabel: 'Evaluating headline clarity, completeness, and recruiter visibility',
    backendStatus: 'LINKEDIN_ANALYSIS',
    minDuration: 1600,
  },
  {
    id: 'report',
    label: 'Generating your report',
    sublabel: 'Compiling findings, gap analysis, and recommendations',
    backendStatus: 'REPORT_GENERATION',
    minDuration: 1200,
  },
  {
    id: 'finalizing',
    label: 'Finalizing your results',
    sublabel: 'Packaging your personalized employability report',
    backendStatus: 'COMPLETED',
    minDuration: 800,
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 120_000;
const PROGRESS_TICK_MS = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusToStageIndex(status: AnalysisStatus): number {
  const map: Partial<Record<AnalysisStatus, number>> = {
    INITIATED:         0,
    ACCEPTED:          0,
    SCORING:           1,
    LINKEDIN_ANALYSIS: 2,
    REPORT_GENERATION: 3,
    COMPLETED:         4,
  };
  return map[status] ?? 0;
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  onRetry,
  onCheckReport,
}: {
  message: string;
  onRetry: () => void;
  onCheckReport?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-red-600/8 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-3">Analysis Could Not Complete</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-sm mx-auto">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-blue-900/40"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Try Again
          </button>
          {onCheckReport && (
            <button
              onClick={onCheckReport}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl border border-white/10 transition-colors duration-200"
            >
              Check if report is ready
            </button>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-left">
          <p className="text-xs text-slate-500 mb-2.5 font-semibold">Need help? Your data is safe.</p>
          <div className="flex flex-col gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Analysis+not+completing`}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { state, dispatch, setLinkedinUrlError } = useFlow();

  const [stageIndex, setStageIndex]   = useState(0);
  const [completedStages, setCompleted] = useState<Set<number>>(new Set());
  const [progressPct, setProgressPct]  = useState(0);
  const [done, setDone]               = useState(false);
  const [fadeOut, setFadeOut]         = useState(false);
  const [error, setError]             = useState('');
  const [slowWarning, setSlowWarning] = useState(false);

  const triggeredRef    = useRef(false);
  const mountedRef      = useRef(true);
  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef    = useRef<number>(0);
  const stageTimerRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Redirect guards ──────────────────────────────────────────────────────────
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    const nav = navigateRef.current;
    if (!state.paymentCompleted || !state.paymentRef) {
      nav(ROUTES.CHECKOUT, { replace: true });
      return;
    }
    if (!state.candidateCode || !state.candidateDetails) {
      nav(ROUTES.DETAILS, { replace: true });
      return;
    }
    if (!state.diagnosticSubmitted) {
      nav(ROUTES.DIAGNOSTIC, { replace: true });
    }
  }, []); // intentional: mount-only guard — state is hydrated from localStorage before first render

  // ── Progress bar animation ───────────────────────────────────────────────────
  const animateProgressTo = useCallback((target: number) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgressPct((prev) => {
        const next = Math.min(target, parseFloat((prev + 0.6).toFixed(1)));
        if (next >= target) {
          clearInterval(progressTimerRef.current!);
          progressTimerRef.current = null;
        }
        return next;
      });
    }, PROGRESS_TICK_MS);
  }, []);

  // ── Advance a stage visually ─────────────────────────────────────────────────
  const advanceToStage = useCallback((idx: number) => {
    setStageIndex(idx);
    const targetProgress = Math.min(92, ((idx + 1) / STAGES.length) * 92);
    animateProgressTo(targetProgress);
  }, [animateProgressTo]);

  const markStageComplete = useCallback((idx: number) => {
    setCompleted((prev) => new Set([...prev, idx]));
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      stageTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  // ── LinkedIn URL correction redirect ─────────────────────────────────────────
  const redirectForLinkedInFix = useCallback((message?: string) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];
    dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'idle' });
    setLinkedinUrlError(
      message || 'Your LinkedIn profile URL appears invalid. Please correct it to continue.',
    );
    navigate(ROUTES.DETAILS, { replace: true });
  }, [dispatch, navigate, setLinkedinUrlError]);

  // ── Poll backend for status ──────────────────────────────────────────────────
  const pollStatus = useCallback((candidateCode: string) => {
    const elapsed = Date.now() - startTimeRef.current;

    if (elapsed > MAX_POLL_DURATION_MS) {
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'failed' });
      setError(
        'Analysis is taking longer than expected. Your profile has been saved — please try again in a moment.',
      );
      return;
    }

    diagnosticApi.getAnalysisStatus(candidateCode).then((result) => {
      if (!mountedRef.current) return;

      if (!result.ok) {
        if (mountedRef.current) {
          pollTimerRef.current = setTimeout(() => pollStatus(candidateCode), POLL_INTERVAL_MS);
        }
        return;
      }

      const { status, errorMessage } = result.data;

      if (status === 'FAILED') {
        const msgLower = errorMessage?.toLowerCase() ?? '';
        const isLinkedInError =
          result.data.errorCode === 'INVALID_LINKEDIN_URL' ||
          (msgLower.includes('linkedin') &&
            (msgLower.includes('invalid') || msgLower.includes('url')));
        if (isLinkedInError) {
          redirectForLinkedInFix(errorMessage);
          return;
        }
        dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'failed' });
        setError(
          errorMessage
            ? `We couldn't complete your analysis: ${errorMessage}`
            : 'Something went wrong during analysis. Please try again.',
        );
        return;
      }

      const newStageIdx = statusToStageIndex(status);
      advanceToStage(newStageIdx);

      if (newStageIdx > 0) {
        for (let i = 0; i < newStageIdx; i++) markStageComplete(i);
      }

      if (status === 'COMPLETED') {
        onAnalysisComplete(candidateCode);
        return;
      }

      if (mountedRef.current) {
        pollTimerRef.current = setTimeout(() => pollStatus(candidateCode), POLL_INTERVAL_MS);
      }
    }).catch(() => {
      if (!mountedRef.current) return;
      pollTimerRef.current = setTimeout(() => pollStatus(candidateCode), POLL_INTERVAL_MS);
    });
  }, [advanceToStage, markStageComplete, dispatch, redirectForLinkedInFix]); // onAnalysisComplete omitted: defined after pollStatus, referenced via closure in recursive setTimeout

  // ── On analysis complete → finish animation → navigate ───────────────────────
  const onAnalysisComplete = useCallback(async (candidateCode: string) => {
    dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'completed' });
    Analytics.reportGeneratedViewed(candidateCode, 0, '');
    LeadCapture.onReportDone(candidateCode);

    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];

    setCompleted(new Set(STAGES.map((_, i) => i)));
    setStageIndex(STAGES.length - 1);
    animateProgressTo(100);

    await delay(700);
    setDone(true);
    await delay(900);
    setFadeOut(true);
    await delay(500);
    dispatch({ type: 'SET_STEP', payload: 'report' });
    navigate(ROUTES.REPORT);
  }, [animateProgressTo, dispatch, navigate]);

  // ── Trigger analysis ─────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async (candidateCode: string, linkedinUrl: string) => {
    setError('');
    setDone(false);
    setFadeOut(false);
    setProgressPct(0);
    setStageIndex(0);
    setCompleted(new Set());
    setSlowWarning(false);

    const slowTimer = setTimeout(() => setSlowWarning(true), 90_000);
    stageTimerRef.current.push(slowTimer);

    startTimeRef.current = Date.now();
    dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'triggered' });
    Analytics.analysisStarted(candidateCode);

    // Drive a minimum visual stage before backend responds
    advanceToStage(0);

    const minTimer = setTimeout(() => markStageComplete(0), STAGES[0].minDuration);
    stageTimerRef.current.push(minTimer);

    const result = await diagnosticApi.triggerAnalysis({ candidateCode, linkedinUrl });

    if (!result.ok) {
      clearTimeout(minTimer);
      if (result.error.code === 'INVALID_LINKEDIN_URL') {
        redirectForLinkedInFix(result.error.message);
        return;
      }
      const isTimeout = result.error.code === 'TIMEOUT';
      setError(
        isTimeout
          ? 'The analysis request timed out. Please check your connection and try again.'
          : 'We could not start your analysis right now. Please try again.',
      );
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'failed' });
      return;
    }

    const { status } = result.data;

    if (status === 'FAILED') {
      setError('Analysis could not be started. Please try again.');
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'failed' });
      return;
    }

    if (status === 'COMPLETED') {
      onAnalysisComplete(candidateCode);
      return;
    }

    // Async path — start polling
    dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'polling' });

    // Drive visual stage progression independently based on minDurations
    let cumulativeDelay = STAGES[0].minDuration;
    for (let i = 1; i < STAGES.length - 1; i++) {
      const idx = i;
      const t1 = setTimeout(() => advanceToStage(idx), cumulativeDelay);
      const t2 = setTimeout(() => markStageComplete(idx - 1), cumulativeDelay + 80);
      stageTimerRef.current.push(t1, t2);
      cumulativeDelay += STAGES[idx].minDuration;
    }

    pollTimerRef.current = setTimeout(() => pollStatus(candidateCode), POLL_INTERVAL_MS);
  }, [advanceToStage, markStageComplete, pollStatus, onAnalysisComplete, dispatch, redirectForLinkedInFix]);

  // ── Kick off on mount (prevent double-trigger) ────────────────────────────────
  useEffect(() => {
    if (triggeredRef.current) return;
    if (!state.candidateCode || !state.diagnosticSubmitted) return;

    // If already completed in this session, go straight to report
    if (state.analysisStatus === 'completed' && state.step === 'report') {
      navigate(ROUTES.REPORT, { replace: true });
      return;
    }

    const linkedinUrl = state.candidateDetails?.linkedinUrl ?? '';
    if (!linkedinUrl.trim()) {
      redirectForLinkedInFix('Your LinkedIn profile URL is missing. Please add it to continue.');
      return;
    }

    triggeredRef.current = true;
    runAnalysis(state.candidateCode, linkedinUrl);
  }, [state.candidateCode, state.diagnosticSubmitted]); // runAnalysis and state.candidateDetails omitted: triggeredRef prevents re-runs; runAnalysis is stable

  // ── Retry handler ─────────────────────────────────────────────────────────────
  function handleRetry() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];
    triggeredRef.current = false;

    if (!state.candidateCode) return;

    const linkedinUrl = state.candidateDetails?.linkedinUrl ?? '';
    if (!linkedinUrl.trim()) {
      redirectForLinkedInFix('Your LinkedIn profile URL is missing. Please add it to continue.');
      return;
    }

    triggeredRef.current = true;
    runAnalysis(state.candidateCode, linkedinUrl);
  }

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!state.paymentCompleted || !state.candidateCode || !state.diagnosticSubmitted) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    const isTimeout = error.includes('taking longer') || error.includes('timed out');
    return (
      <ErrorScreen
        message={error}
        onRetry={handleRetry}
        onCheckReport={isTimeout ? () => navigate(ROUTES.REPORT) : undefined}
      />
    );
  }

  const candidate = state.candidateDetails;

  return (
    <div
      className={[
        'min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center px-4 transition-opacity duration-500',
        fadeOut ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,179,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Orbital ring */}
        <div className="flex justify-center mb-10">
          <div className="relative w-24 h-24">
            <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 96 96" fill="none">
              <circle cx="48" cy="48" r="44" stroke="rgba(59,130,246,0.15)" strokeWidth="1.5" />
              <circle
                cx="48" cy="48" r="44"
                stroke="url(#ringGrad)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="70 208"
                strokeDashoffset="0"
              />
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            <svg className="absolute inset-0 w-full h-full animate-spin-reverse-slow" viewBox="0 0 96 96" fill="none">
              <circle
                cx="48" cy="48" r="36"
                stroke="rgba(6,182,212,0.12)"
                strokeWidth="1"
                strokeDasharray="20 200"
              />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
                {done ? (
                  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3">
            {done ? 'Analysis Complete' : 'Analyzing Your Profile'}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
            {done
              ? 'Your employability report is ready.'
              : 'We\'re reviewing your responses, LinkedIn signals, and employability patterns.'}
          </p>
          {candidate && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <div className={[
                'w-1.5 h-1.5 rounded-full',
                done ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse',
              ].join(' ')} />
              <span className="text-xs text-slate-400 font-medium">{candidate.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">{candidate.jobRole}</span>
            </div>
          )}
        </div>

        {/* Stage list */}
        <div className="space-y-2 mb-8">
          {STAGES.map((stage, i) => {
            const isActive = i === stageIndex && !done;
            const isDone   = completedStages.has(i) || done;

            return (
              <div
                key={stage.id}
                className={[
                  'relative flex items-start gap-4 px-5 py-4 rounded-xl border transition-all duration-500',
                  isActive
                    ? 'bg-blue-950/60 border-blue-500/40 shadow-lg shadow-blue-950/40'
                    : isDone
                    ? 'bg-white/[0.03] border-white/[0.06]'
                    : 'bg-transparent border-transparent',
                ].join(' ')}
              >
                <div
                  className={[
                    'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 transition-all duration-500',
                    isActive
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : isDone
                      ? 'bg-emerald-500/15 border border-emerald-500/40'
                      : 'bg-white/5 border border-white/10',
                  ].join(' ')}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-600">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-medium transition-colors duration-300 leading-snug',
                    isActive ? 'text-white' : isDone ? 'text-slate-400' : 'text-slate-600',
                  ].join(' ')}>
                    {stage.label}
                  </p>
                  {(isActive || isDone) && (
                    <p className={[
                      'text-xs mt-0.5 transition-all duration-300',
                      isActive ? 'text-blue-400/80' : 'text-slate-600',
                    ].join(' ')}>
                      {stage.sublabel}
                    </p>
                  )}
                </div>

                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] rounded-b-xl overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-shimmer" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-slate-500 font-medium">
              {done ? 'Complete' : 'Processing'}
            </span>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {Math.round(progressPct)}%
            </span>
          </div>

          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progressPct}%`,
                background: done
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              }}
            />
          </div>

          {done && (
            <p className="text-center text-xs text-emerald-400/80 font-medium mt-3 animate-fade-in">
              Analysis complete — loading your report
            </p>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="mt-8 text-center">
            {slowWarning ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4">
                <p className="text-xs text-slate-400 mb-1.5 font-medium">This is taking a little longer than usual.</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your data is safe and analysis is still running. Please keep this tab open.
                  If it doesn't complete in the next minute, you can{' '}
                  <button
                    onClick={() => navigate(ROUTES.REPORT)}
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    check if your report is ready
                  </button>
                  {' '}or{' '}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Analysis+taking+too+long`}
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    contact support
                  </a>
                  .
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-700">
                Do not close this tab &nbsp;·&nbsp; Analysis is running
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
