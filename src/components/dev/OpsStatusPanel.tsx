import { useState } from 'react';
import { Settings, X, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { opFlags, type OpFlagKey } from '../../utils/opFlags';
import { env } from '../../config/env';

const IS_DEV = import.meta.env.DEV;
const LS_KEY = 'qs_op_flags';

interface FlagMeta {
  key: OpFlagKey;
  label: string;
  description: string;
  severity: 'warn' | 'info';
}

const FLAG_META: FlagMeta[] = [
  {
    key: 'mockPayment',
    label: 'Mock Payment',
    description: 'Skip Razorpay — accept any payment without charging the user.',
    severity: 'warn',
  },
  {
    key: 'disableMessaging',
    label: 'Disable Messaging',
    description: 'Suppress WhatsApp and email dispatch. Events are still logged.',
    severity: 'info',
  },
  {
    key: 'disableCrm',
    label: 'Disable CRM',
    description: 'Skip CRM webhook push on report generation and booking.',
    severity: 'info',
  },
  {
    key: 'fallbackReportOnly',
    label: 'Fallback Report Only',
    description: 'Force rule-based report generation — skip OpenAI entirely.',
    severity: 'info',
  },
];

function readOverrides(): Partial<Record<OpFlagKey, boolean>> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<OpFlagKey, boolean>>) : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Partial<Record<OpFlagKey, boolean>>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

function EnvRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {ok
        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        : <XCircle    className="w-3.5 h-3.5 text-red-400    shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-slate-400 font-mono break-all">{label}</span>
        <span className="ml-1.5 text-[11px] text-slate-600 truncate">{value}</span>
      </div>
    </div>
  );
}

export default function OpsStatusPanel() {
  const [open, setOpen]         = useState(false);
  const [flags, setFlags]       = useState<Record<OpFlagKey, boolean>>(opFlags.all());
  const [overrides, setOverrides] = useState<Partial<Record<OpFlagKey, boolean>>>(readOverrides());

  if (!IS_DEV) return null;

  function toggle(key: OpFlagKey) {
    const current = flags[key];
    const next    = !current;
    const updated = { ...overrides, [key]: next };
    writeOverrides(updated);
    setOverrides(updated);
    setFlags({ ...flags, [key]: next });
  }

  function resetAll() {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setOverrides({});
    setFlags(opFlags.all());
  }

  const activeCount = Object.values(flags).filter(Boolean).length;

  const envChecks = [
    { label: 'VITE_API_BASE_URL',    value: env.apiBaseUrl      || '(missing)', ok: !!env.apiBaseUrl },
    { label: 'VITE_SUPABASE_URL',    value: env.supabaseUrl     ? '✓ set' : '(missing)', ok: !!env.supabaseUrl },
    { label: 'VITE_SUPABASE_ANON_KEY', value: env.supabaseAnonKey ? '✓ set' : '(missing)', ok: !!env.supabaseAnonKey },
    { label: 'VITE_RAZORPAY_KEY_ID', value: env.razorpayKeyId   ? (env.razorpayKeyId.startsWith('rzp_live_') ? 'live mode' : 'test mode') : '(missing — mock only)', ok: true },
    { label: 'FF: linkedinAnalysis', value: String(env.features.linkedinAnalysis), ok: true },
    { label: 'FF: llmReport',        value: String(env.features.llmReport), ok: true },
    { label: 'FF: crmSync',          value: String(env.features.crmSync), ok: true },
    { label: 'FF: notifications',    value: String(env.features.notifications), ok: true },
  ];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          'fixed bottom-5 left-5 z-[9999] flex items-center gap-2 bg-[#0D1120] border rounded-xl px-3 py-2 shadow-2xl transition-all hover:scale-105',
          activeCount > 0 ? 'border-amber-500/50 hover:border-amber-400/60' : 'border-white/10 hover:border-white/20',
        ].join(' ')}
        title="Ops Status Panel"
      >
        <Settings className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
        <span className="text-xs font-semibold text-slate-300">Ops</span>
        {activeCount > 0 && (
          <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-16 left-5 z-[9999] w-[340px] max-h-[580px] flex flex-col bg-[#0A0F1E] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white">Operational Flags</span>
              <span className="text-xs text-slate-600">DEV ONLY</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetAll}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-600 hover:text-slate-300 transition-colors"
                title="Reset all overrides"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-600 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            <div className="px-4 py-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Mode Flags</p>
              {FLAG_META.map(({ key, label, description, severity }) => {
                const active = flags[key];
                return (
                  <div
                    key={key}
                    className={[
                      'flex items-start gap-3 p-2.5 rounded-xl border transition-all',
                      active
                        ? severity === 'warn'
                          ? 'bg-amber-950/40 border-amber-500/30'
                          : 'bg-blue-950/40 border-blue-500/20'
                        : 'bg-white/[0.02] border-white/[0.05]',
                    ].join(' ')}
                  >
                    <button
                      onClick={() => toggle(key)}
                      className={[
                        'shrink-0 mt-0.5 w-8 h-4.5 rounded-full border transition-all duration-200 relative',
                        active
                          ? severity === 'warn'
                            ? 'bg-amber-500 border-amber-400'
                            : 'bg-blue-500 border-blue-400'
                          : 'bg-white/[0.08] border-white/[0.12]',
                      ].join(' ')}
                      style={{ width: 30, height: 18 }}
                      title={`Toggle ${label}`}
                    >
                      <span
                        className={[
                          'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200',
                          active ? 'left-3' : 'left-0.5',
                        ].join(' ')}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {active && severity === 'warn' && (
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        <span className={`text-xs font-semibold ${active ? (severity === 'warn' ? 'text-amber-300' : 'text-blue-300') : 'text-slate-400'}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 space-y-0.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Environment</p>
              {envChecks.map((c) => (
                <EnvRow key={c.label} label={c.label} value={c.value} ok={c.ok} />
              ))}
            </div>
          </div>

          <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] shrink-0">
            <p className="text-[11px] text-slate-700">
              Overrides stored in localStorage · Reload to apply · Prod ignores all overrides
            </p>
          </div>
        </div>
      )}
    </>
  );
}
