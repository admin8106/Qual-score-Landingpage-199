/**
 * Operational Mode Flags
 *
 * These flags control live system behaviour without requiring a redeploy.
 * They are read from:
 *   1. Environment variables (baked at build time via Vite)
 *   2. localStorage overrides (runtime, developer/ops use only)
 *
 * localStorage overrides are ONLY honoured in non-production builds.
 * In production, only the env-var values apply.
 *
 * ─── How to use in dev/staging ────────────────────────────────────────────────
 * Open the browser console and run:
 *
 *   QualScore.ops.set('mockPayment', true)      // use mock payment flow
 *   QualScore.ops.set('disableMessaging', true) // suppress WA + email triggers
 *   QualScore.ops.set('disableCrm', true)       // suppress CRM push
 *   QualScore.ops.set('fallbackReportOnly', true) // skip AI, use rule-based report
 *   QualScore.ops.reset()                       // clear all overrides
 *
 * ─── Environment variables ────────────────────────────────────────────────────
 *   VITE_OP_MOCK_PAYMENT=true          Use mock payment — never charge the user
 *   VITE_OP_DISABLE_MESSAGING=true     Skip WhatsApp + email dispatch
 *   VITE_OP_DISABLE_CRM=true          Skip CRM webhook push
 *   VITE_OP_FALLBACK_REPORT_ONLY=true  Skip AI report — use rule-based fallback
 */

const IS_PROD = import.meta.env.PROD as boolean;
const LS_KEY  = 'qs_op_flags';

export type OpFlagKey =
  | 'mockPayment'
  | 'disableMessaging'
  | 'disableCrm'
  | 'fallbackReportOnly';

const ENV_MAP: Record<OpFlagKey, string> = {
  mockPayment:        'VITE_OP_MOCK_PAYMENT',
  disableMessaging:   'VITE_OP_DISABLE_MESSAGING',
  disableCrm:         'VITE_OP_DISABLE_CRM',
  fallbackReportOnly: 'VITE_OP_FALLBACK_REPORT_ONLY',
};

function readEnvFlag(key: OpFlagKey): boolean {
  const raw = import.meta.env[ENV_MAP[key]] as string | undefined;
  return raw === 'true' || raw === '1';
}

function readLocalOverrides(): Partial<Record<OpFlagKey, boolean>> {
  if (IS_PROD) return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<OpFlagKey, boolean>>) : {};
  } catch {
    return {};
  }
}

function writeLocalOverrides(overrides: Partial<Record<OpFlagKey, boolean>>): void {
  if (IS_PROD) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function resolveFlag(key: OpFlagKey): boolean {
  const envValue = readEnvFlag(key);
  if (IS_PROD) return envValue;
  const overrides = readLocalOverrides();
  return key in overrides ? (overrides[key] as boolean) : envValue;
}

export const opFlags = {
  get mockPayment():        boolean { return resolveFlag('mockPayment'); },
  get disableMessaging():   boolean { return resolveFlag('disableMessaging'); },
  get disableCrm():         boolean { return resolveFlag('disableCrm'); },
  get fallbackReportOnly(): boolean { return resolveFlag('fallbackReportOnly'); },

  all(): Record<OpFlagKey, boolean> {
    return {
      mockPayment:        resolveFlag('mockPayment'),
      disableMessaging:   resolveFlag('disableMessaging'),
      disableCrm:         resolveFlag('disableCrm'),
      fallbackReportOnly: resolveFlag('fallbackReportOnly'),
    };
  },
} as const;

// ─── Dev console API ──────────────────────────────────────────────────────────
// Exposed as window.QualScore.ops in non-production builds.

if (!IS_PROD) {
  const opsConsole = {
    set(key: OpFlagKey, value: boolean): void {
      const overrides = readLocalOverrides();
      overrides[key] = value;
      writeLocalOverrides(overrides);
      console.info(`[QualScore] Op flag "${key}" set to ${value}. Refresh to apply.`);
    },
    reset(): void {
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
      console.info('[QualScore] All op flag overrides cleared. Refresh to apply.');
    },
    status(): void {
      console.table(opFlags.all());
    },
  };

  const win = window as Window & {
    QualScore?: { ops?: typeof opsConsole };
  };
  win.QualScore = win.QualScore ?? {};
  win.QualScore.ops = opsConsole;

  const active = Object.entries(opFlags.all())
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (active.length > 0) {
    console.warn(
      `[QualScore] Active operational flags: ${active.join(', ')}\n` +
      `Run QualScore.ops.status() to see all flags or QualScore.ops.reset() to clear.`
    );
  }
}
