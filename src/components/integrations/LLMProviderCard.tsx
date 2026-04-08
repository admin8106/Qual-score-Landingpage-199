import { Star, GitBranch, CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import type { AiProviderConfig, AiTestLog } from '../../api/services/aiProviders';

const PROVIDER_META: Record<string, { label: string; color: string; bg: string }> = {
  openai:    { label: 'OpenAI',    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  anthropic: { label: 'Anthropic', color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  gemini:    { label: 'Gemini',    color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
  deepseek:  { label: 'DeepSeek',  color: 'text-sky-400',     bg: 'bg-sky-500/10'    },
  custom:    { label: 'Custom',    color: 'text-slate-400',   bg: 'bg-slate-500/10'  },
};

function ProviderInitial({ code }: { code: string }) {
  const meta = PROVIDER_META[code.toLowerCase()] ?? PROVIDER_META.custom;
  return (
    <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
      <span className={`text-sm font-bold ${meta.color}`}>
        {(PROVIDER_META[code.toLowerCase()]?.label ?? code)[0].toUpperCase()}
      </span>
    </div>
  );
}

function TestStatusIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle className="w-3 h-3 text-emerald-400" />;
  if (status === 'FAILURE') return <XCircle className="w-3 h-3 text-red-400" />;
  if (status === 'TIMEOUT') return <Clock className="w-3 h-3 text-amber-400" />;
  return <AlertTriangle className="w-3 h-3 text-slate-600" />;
}

interface Props {
  provider: AiProviderConfig;
  latestLog: AiTestLog | null;
  onClick: () => void;
}

export default function LLMProviderCard({ provider, latestLog, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-4 cursor-pointer transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProviderInitial code={provider.provider_code} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{provider.provider_name}</p>
            <p className="text-xs text-slate-600 font-mono truncate">{provider.model_name}</p>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 shrink-0 mt-0.5 transition-colors" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
          provider.is_active
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${provider.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          {provider.is_active ? 'Active' : 'Inactive'}
        </span>

        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
          provider.environment_mode === 'LIVE'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
        }`}>
          {provider.environment_mode}
        </span>

        {provider.is_primary && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> Primary
          </span>
        )}

        {provider.is_fallback && (
          <span className="inline-flex items-center gap-1 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">
            <GitBranch className="w-2.5 h-2.5" /> Fallback
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-3">
        <div>
          <span className="text-slate-700">Temp</span>
          <p className="text-slate-400 font-mono">{provider.temperature}</p>
        </div>
        <div>
          <span className="text-slate-700">Tokens</span>
          <p className="text-slate-400 font-mono">{provider.max_tokens}</p>
        </div>
        <div>
          <span className="text-slate-700">Timeout</span>
          <p className="text-slate-400 font-mono">{provider.timeout_seconds}s</p>
        </div>
      </div>

      {latestLog ? (
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
          <TestStatusIcon status={latestLog.status} />
          <span className="text-xs text-slate-600 truncate">{latestLog.response_summary || latestLog.status}</span>
          {latestLog.latency_ms && (
            <span className="text-xs text-slate-700 shrink-0 ml-auto">{latestLog.latency_ms}ms</span>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-white/[0.04]">
          <span className="text-xs text-slate-700">{provider.api_key_masked ? 'Key configured' : 'No API key set'}</span>
        </div>
      )}
    </div>
  );
}
