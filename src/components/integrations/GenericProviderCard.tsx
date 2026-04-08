import { Star, GitBranch, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import type { GenericTestLog } from '../../api/services/genericProviders';

export interface GenericCardProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  [key: string]: unknown;
}

export type ProviderMeta = Record<string, { label: string; color: string; bg: string; abbr: string }>;

interface Props {
  provider: GenericCardProvider;
  meta: ProviderMeta;
  latestLog: GenericTestLog | null;
  subtitle?: string;
  hidePrimaryBadge?: boolean;
  onClick: () => void;
}

export default function GenericProviderCard({ provider, meta, latestLog, subtitle, hidePrimaryBadge, onClick }: Props) {
  const m = meta[provider.provider_code.toLowerCase()] ?? { label: provider.provider_code, color: 'text-slate-400', bg: 'bg-slate-500/10', abbr: provider.provider_code.slice(0, 2).toUpperCase() };

  return (
    <div
      onClick={onClick}
      className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-4 cursor-pointer transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
            <span className={`text-xs font-bold ${m.color}`}>{m.abbr}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{provider.provider_name}</p>
            <p className={`text-xs font-medium ${m.color}`}>{m.label}</p>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 shrink-0 mt-0.5 transition-colors" />
      </div>

      {subtitle && <p className="text-xs text-slate-600 mb-2.5 truncate">{subtitle}</p>}

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

        {!hidePrimaryBadge && provider.is_primary && (
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

      <div className="pt-2 border-t border-white/[0.04]">
        {latestLog ? (
          <div className="flex items-center gap-1.5">
            {latestLog.status === 'PASS'
              ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
              : latestLog.status === 'FAIL'
              ? <XCircle className="w-3 h-3 text-red-400 shrink-0" />
              : <AlertCircle className="w-3 h-3 text-slate-600 shrink-0" />
            }
            <span className="text-xs text-slate-600 truncate">{latestLog.summary}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-700">No tests run yet</span>
        )}
      </div>
    </div>
  );
}
