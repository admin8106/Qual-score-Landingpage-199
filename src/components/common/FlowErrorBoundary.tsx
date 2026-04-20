import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Mail } from 'lucide-react';
import { env } from '../../config/env';

const SUPPORT_EMAIL = 'support@qualscore.in';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class FlowErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });

    console.error('[QualScore] Unhandled error in flow:', {
      message: error.message,
      stack:   error.stack,
      component: info.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    const isDev = !env.isProd;

    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>

            <h1 className="text-xl font-bold text-[#1F2937] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
              An unexpected error occurred. Your progress has been saved — try reloading the page.
              If the problem persists, contact us and we'll sort it out quickly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-xl hover:bg-[#1557B0] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>
              {this.props.onReset && (
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold rounded-xl hover:bg-[#F9FAFB] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </button>
              )}
            </div>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=App+error`}
              className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#1A73E8] transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {SUPPORT_EMAIL}
            </a>

            {isDev && error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-[#9CA3AF] cursor-pointer hover:text-[#6B7280] select-none">
                  Developer details
                </summary>
                <div className="mt-3 bg-[#F3F4F6] rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">{error.name}: {error.message}</p>
                    {error.stack && (
                      <pre className="text-xs text-[#6B7280] whitespace-pre-wrap break-all leading-relaxed font-mono overflow-x-auto">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <p className="text-xs font-semibold text-[#4B5563] mb-1">Component stack:</p>
                      <pre className="text-xs text-[#9CA3AF] whitespace-pre-wrap break-all leading-relaxed font-mono overflow-x-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <p className="text-center text-xs text-[#9CA3AF] mt-4">
            Error ID: {Date.now().toString(36).toUpperCase()}
          </p>
        </div>
      </div>
    );
  }
}
