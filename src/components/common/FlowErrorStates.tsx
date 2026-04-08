/**
 * Shared error, loading, and empty-state components used across the funnel.
 *
 * All user-facing messages are written in plain English — no technical jargon.
 * Each component is self-contained and accepts only what it needs to render.
 */

import { RefreshCw, WifiOff, Clock, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function IconBox({
  icon: Icon,
  color = 'blue',
}: {
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'red' | 'amber' | 'slate';
}) {
  const colors = {
    blue:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
    red:   'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    slate: 'bg-slate-700 border-white/10 text-slate-400',
  };
  return (
    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-5 ${colors[color]}`}>
      <Icon className="w-6 h-6" />
    </div>
  );
}

// ─── Generic full-page loading spinner ────────────────────────────────────────

export function PageLoadingState({
  message = 'Please wait...',
  subMessage,
  dark = false,
}: {
  message?: string;
  subMessage?: string;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#080C18]' : 'bg-[#F2F6FB]';
  const titleColor = dark ? 'text-white' : 'text-[#1F2937]';
  const bodyColor = dark ? 'text-slate-400' : 'text-[#6B7280]';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
        <h2 className={`text-base font-semibold mb-2 ${titleColor}`}>{message}</h2>
        {subMessage && <p className={`text-sm leading-relaxed ${bodyColor}`}>{subMessage}</p>}
      </div>
    </div>
  );
}

// ─── Network / offline error ───────────────────────────────────────────────────

export function NetworkErrorState({
  onRetry,
  dark = false,
}: {
  onRetry: () => void;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#080C18]' : 'bg-[#F2F6FB]';
  const titleColor = dark ? 'text-white' : 'text-[#1F2937]';
  const bodyColor = dark ? 'text-slate-400' : 'text-[#6B7280]';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className="text-center max-w-sm">
        <IconBox icon={WifiOff} color="amber" />
        <h2 className={`text-lg font-semibold mb-2 ${titleColor}`}>No Connection</h2>
        <p className={`text-sm leading-relaxed mb-6 ${bodyColor}`}>
          We couldn't reach the server. Please check your internet connection and try again. Your progress is saved.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Timeout error ────────────────────────────────────────────────────────────

export function TimeoutErrorState({
  onRetry,
  dark = false,
}: {
  onRetry: () => void;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#080C18]' : 'bg-[#F2F6FB]';
  const titleColor = dark ? 'text-white' : 'text-[#1F2937]';
  const bodyColor = dark ? 'text-slate-400' : 'text-[#6B7280]';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className="text-center max-w-sm">
        <IconBox icon={Clock} color="amber" />
        <h2 className={`text-lg font-semibold mb-2 ${titleColor}`}>This Is Taking Too Long</h2>
        <p className={`text-sm leading-relaxed mb-6 ${bodyColor}`}>
          The server didn't respond in time. Your data is safe — please try again. If this keeps happening, your report may already be ready.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Generic server / unknown error ───────────────────────────────────────────

export function ServerErrorState({
  title = 'Something Went Wrong',
  message = "We hit an unexpected issue. Your data is safe. Please try again — it usually resolves quickly.",
  onRetry,
  onBack,
  backLabel = 'Go Back',
  dark = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#080C18]' : 'bg-[#F2F6FB]';
  const titleColor = dark ? 'text-white' : 'text-[#1F2937]';
  const bodyColor = dark ? 'text-slate-400' : 'text-[#6B7280]';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className="text-center max-w-sm">
        <IconBox icon={AlertTriangle} color="red" />
        <h2 className={`text-lg font-semibold mb-2 ${titleColor}`}>{title}</h2>
        <p className={`text-sm leading-relaxed mb-6 ${bodyColor}`}>{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className={`inline-flex items-center justify-center gap-2 text-sm px-5 py-2.5 rounded-xl border transition-colors ${
                dark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-white hover:bg-[#F2F6FB] text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Access denied (route guard redirect fallback) ─────────────────────────────

export function AccessDeniedState({
  message = 'Please complete the previous step first.',
  onAction,
  actionLabel = 'Go to Start',
  dark = false,
}: {
  message?: string;
  onAction: () => void;
  actionLabel?: string;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#080C18]' : 'bg-[#F2F6FB]';
  const titleColor = dark ? 'text-white' : 'text-[#1F2937]';
  const bodyColor = dark ? 'text-slate-400' : 'text-[#6B7280]';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className="text-center max-w-sm">
        <IconBox icon={Lock} color="slate" />
        <h2 className={`text-lg font-semibold mb-2 ${titleColor}`}>Step Not Available Yet</h2>
        <p className={`text-sm leading-relaxed mb-6 ${bodyColor}`}>{message}</p>
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Inline banner error (for within-page use) ────────────────────────────────

export function InlineBanner({
  type = 'error',
  message,
  onDismiss,
  onRetry,
  className = '',
}: {
  type?: 'error' | 'warning' | 'success' | 'info';
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}) {
  const styles = {
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  };
  const Icon = type === 'error' || type === 'warning' ? AlertTriangle : RefreshCw;

  return (
    <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${styles[type]} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex-1 leading-relaxed">{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button onClick={onRetry} className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity text-xs">
            Retry
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="font-semibold hover:opacity-70 transition-opacity text-xs leading-none">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Dark inline error (for dark-themed pages like report/analysis) ────────────

export function DarkInlineBanner({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-red-300 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-300 font-semibold hover:text-red-100 transition-colors shrink-0 underline underline-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}
