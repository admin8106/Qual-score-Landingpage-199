import { Star, GitBranch, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import type { PaymentProviderConfig, PaymentTestLog } from '../../api/services/paymentProviders';

const PROVIDER_META: Record<string, { label: string; color: string; bg: string; abbr: string }> = {
  payu:      { label: 'PayU',     color: 'text-amber-400',   bg: 'bg-amber-500/10',  abbr: 'PU' },
  razorpay:  { label: 'Razorpay', color: 'text-blue-400',    bg: 'bg-blue-500/10',   abbr: 'RZ' },
  stripe:    { label: 'Stripe',   color: 'text-violet-400',  bg: 'bg-violet-500/10', abbr: 'ST' },
  mock:      { label: 'Mock',     color: 'text-slate-400',   bg: 'bg-slate-500/10',  abbr: 'MK' },
  custom:    { label: 'Custom',   color: 'text-slate-400',   bg: 'bg-slate-500/10',  abbr: 'CU' },
};

function ProviderBadge({ code }: { code: string }) {
  const meta = PROVIDER_META[code.toLowerCase()] ?? PROVIDER_META.custom;
  return (
    <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
      <span className={`text-xs font-bold ${meta.color}`}>{meta.abbr}</span>
    </div>
  );
}

function TestIcon({ status }: { status: string }) {
  if (status === 'PASS') return <CheckCircle className="w-3 h-3 text-emerald-400" />;
  if (status === 'FAIL') return <XCircle className="w-3 h-3 text-red-400" />;
  return <AlertCircle className="w-3 h-3 text-slate-600" />;
}

interface Props {
  provider: PaymentProviderConfig;
  latestLog: PaymentTestLog | null;
  onClick: () => void;
}

export default function PaymentProviderCard({ provider, latestLog, onClick }: Props) {
  const meta = PROVIDER_META[provider.provider_code.toLowerCase()] ?? PROVIDER_META.custom;

  const hasCredentials = (() => {
    if (provider.provider_code === 'mock') return true;
    if (provider.provider_code === 'razorpay') return Boolean(provider.razorpay_key_id);
    if (provider.provider_code === 'payu') return Boolean(provider.payu_merchant_key_masked);
    return false;
  })();

  return (
    <div
      onClick={onClick}
      className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-4 cursor-pointer transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProviderBadge code={provider.provider_code} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{provider.provider_name}</p>
            <p className={`text-xs font-medium ${meta.color}`}>{meta.label}</p>
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

      <div className="pt-2 border-t border-white/[0.04]">
        {latestLog ? (
          <div className="flex items-center gap-1.5">
            <TestIcon status={latestLog.status} />
            <span className="text-xs text-slate-600 truncate">{latestLog.summary}</span>
          </div>
        ) : (
          <span className={`text-xs ${hasCredentials ? 'text-slate-600' : 'text-amber-500/70'}`}>
            {hasCredentials ? 'Credentials configured' : 'No credentials set'}
          </span>
        )}
      </div>
    </div>
  );
}
