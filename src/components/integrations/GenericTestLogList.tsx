import { ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import type { GenericTestLog } from '../../api/services/genericProviders';

const STATUS_LABEL: Record<string, string> = {
  PASS:    'Passed',
  FAIL:    'Failed',
  SKIPPED: 'Skipped',
  PENDING: 'Pending',
};

interface Props {
  logs: GenericTestLog[];
  loading: boolean;
}

export default function GenericTestLogList({ logs, loading }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No tests run yet.</p>
        <p className="text-xs mt-1">Use "Test Config" to validate this provider.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            {log.status === 'PASS'
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />
            }
            <span className={`text-xs font-medium ${log.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
              {STATUS_LABEL[log.status] ?? log.status}
            </span>
            <span className="text-xs text-slate-700 ml-auto">
              {new Date(log.created_at).toLocaleString('en-IN')}
            </span>
          </div>

          {log.summary && <p className="text-xs text-slate-500">{log.summary}</p>}

          {Array.isArray(log.checks_run) && log.checks_run.length > 0 && (
            <div className="space-y-1.5">
              {log.checks_run.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border ${
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
                    <p className={`text-xs font-medium ${check.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                      {check.name}
                    </p>
                    {check.detail && <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
