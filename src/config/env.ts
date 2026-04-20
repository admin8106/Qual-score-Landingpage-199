/**
 * ─── Environment Configuration ────────────────────────────────────────────────
 *
 * Single source of truth for all environment-specific values.
 *
 * RULES:
 *   - Never read import.meta.env directly outside this file.
 *   - All pages, services, and API modules must import from here.
 *   - Variables without a default throw at startup if missing in production.
 *
 * HOW TO ADD A NEW VARIABLE:
 *   1. Add it to .env (dev default), .env.staging, and .env.production.
 *   2. Add a typed accessor below (use `required()` if it must exist in prod).
 *   3. Import `env` from this file wherever you need it.
 *
 * ENV FILES (Vite loads in this priority order, highest first):
 *   .env.local           — personal overrides, git-ignored, never committed
 *   .env.[mode].local    — mode-specific personal overrides, git-ignored
 *   .env.[mode]          — committed, mode-specific (production / staging)
 *   .env                 — committed, base defaults for local development only
 *
 * ─── BOLT HOSTING COMPATIBILITY ───────────────────────────────────────────────
 * When deploying via Bolt, all VITE_ variables must be set in the Bolt
 * environment panel (Project → Settings → Environment Variables).
 * Values from committed .env.production files are used as build-time fallbacks
 * only; variables set in the Bolt panel always take precedence at build time.
 *
 * ─── REQUIRED IN PRODUCTION ───────────────────────────────────────────────────
 *   VITE_API_BASE_URL        — Java Spring Boot backend origin
 *                              (canonical alias in docs: API_BASE_URL)
 *                              e.g. https://api.qualscore.in
 *                              Throws at startup if missing in production build.
 *   VITE_SUPABASE_URL        — Supabase project URL (auto-set by Bolt)
 *   VITE_SUPABASE_ANON_KEY   — Supabase anon key (auto-set by Bolt)
 *
 * ─── OPTIONAL (safe to omit, features degrade gracefully) ─────────────────────
 *   VITE_APP_URL             — canonical frontend origin, used for share links
 *   VITE_RAZORPAY_KEY_ID     — Razorpay publishable key; omit to disable payment
 *   VITE_GA4_MEASUREMENT_ID  — Google Analytics 4 measurement ID (G-XXXXXXXXXX)
 *   VITE_META_PIXEL_ID       — Meta/Facebook Pixel ID
 *   VITE_SENTRY_DSN          — Sentry error tracking DSN
 *
 * ─── FEATURE FLAGS (set to "true" / "false" string) ──────────────────────────
 *   VITE_FF_LINKEDIN_ANALYSIS    — enable real LinkedIn analysis (default: false)
 *   VITE_FF_LLM_REPORT           — enable LLM-generated report narrative (default: false)
 *   VITE_FF_CRM_SYNC             — enable CRM push on report generation (default: false)
 *   VITE_FF_NOTIFICATIONS        — enable WhatsApp/email notifications (default: false)
 *
 * ─── OPERATIONAL FLAGS ────────────────────────────────────────────────────────
 *   VITE_OP_MOCK_PAYMENT         — simulate payment flow, no real charges
 *                                  MUST be false in production.
 *                                  Defaults to false. Set true only when backend is unavailable.
 *   VITE_OP_DISABLE_MESSAGING    — suppress WhatsApp/email dispatch (default: false)
 *   VITE_OP_DISABLE_CRM          — suppress CRM webhook push (default: false)
 *   VITE_OP_FALLBACK_REPORT_ONLY — skip AI, use rule-based report fallback (default: false)
 */

const IS_DEV  = import.meta.env.DEV  as boolean;
const IS_PROD = import.meta.env.PROD as boolean;
const MODE    = import.meta.env.MODE as string;

function required(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    if (IS_PROD) {
      throw new Error(
        `[QualScore] Missing required environment variable: ${key}. ` +
        `Set it in your Bolt environment panel or .env.production and rebuild.`
      );
    }
    console.warn(`[env] Missing env var "${key}" — using empty string. This will fail in production.`);
    return '';
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

function flag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key] as string | undefined;
  if (raw === undefined) return defaultValue;
  return raw === 'true' || raw === '1';
}

// ─── Core config ──────────────────────────────────────────────────────────────

export const env = {
  isDev:  IS_DEV,
  isProd: IS_PROD,
  mode:   MODE as 'development' | 'staging' | 'production',

  // Backend API base URL.
  // Set VITE_API_BASE_URL (alias: API_BASE_URL) in your Bolt / deployment platform.
  // Required in production — throws if unset. Defaults to localhost:8080 in dev.
  apiBaseUrl:       IS_PROD ? required('VITE_API_BASE_URL') : optional('VITE_API_BASE_URL', 'http://localhost:8080'),

  appUrl:           optional('VITE_APP_URL', IS_DEV ? 'http://localhost:5173' : ''),

  supabaseUrl:      IS_PROD ? required('VITE_SUPABASE_URL') : optional('VITE_SUPABASE_URL'),
  supabaseAnonKey:  IS_PROD ? required('VITE_SUPABASE_ANON_KEY') : optional('VITE_SUPABASE_ANON_KEY'),

  razorpayKeyId:    optional('VITE_RAZORPAY_KEY_ID'),

  ga4MeasurementId: optional('VITE_GA4_MEASUREMENT_ID'),
  metaPixelId:      optional('VITE_META_PIXEL_ID'),
  sentryDsn:        optional('VITE_SENTRY_DSN'),

  features: {
    linkedinAnalysis:  flag('VITE_FF_LINKEDIN_ANALYSIS',  false),
    llmReport:         flag('VITE_FF_LLM_REPORT',         false),
    crmSync:           flag('VITE_FF_CRM_SYNC',           false),
    notifications:     flag('VITE_FF_NOTIFICATIONS',      false),
  },

  // Operational flags — baked at build time. See src/utils/opFlags.ts for
  // runtime localStorage overrides (available in dev/staging only).
  ops: {
    mockPayment:        flag('VITE_OP_MOCK_PAYMENT',         false),
    disableMessaging:   flag('VITE_OP_DISABLE_MESSAGING',    false),
    disableCrm:         flag('VITE_OP_DISABLE_CRM',          false),
    fallbackReportOnly: flag('VITE_OP_FALLBACK_REPORT_ONLY', false),
  },
} as const;

// ─── Startup validation ────────────────────────────────────────────────────────
//
// In non-production environments, warn about missing optional config that
// would be required in production. The `required()` helper already throws
// in production if a critical variable is missing.

if (!IS_PROD) {
  const OPTIONAL_WARNED = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = OPTIONAL_WARNED.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    console.warn(
      `[env] DEV/STAGING: The following env vars are not set (required in prod):\n` +
      missing.map((k) => `  - ${k}`).join('\n')
    );
  }
}

// ─── Production safety checks ─────────────────────────────────────────────────
// These run at module load time in production to surface critical misconfigurations.
// They log errors but never crash the app — ops must review the browser console.

if (IS_PROD) {
  if (flag('VITE_OP_MOCK_PAYMENT', false)) {
    console.error(
      '[env] PRODUCTION WARNING: VITE_OP_MOCK_PAYMENT=true — payments are simulated. ' +
      'No real charges will occur. Set VITE_OP_MOCK_PAYMENT=false and redeploy.'
    );
  }

  const apiBase = optional('VITE_API_BASE_URL');
  if (!apiBase || apiBase.includes('localhost')) {
    console.error(
      '[env] PRODUCTION WARNING: VITE_API_BASE_URL is not set or points to localhost. ' +
      'All Java backend API calls will fail. ' +
      'Set VITE_API_BASE_URL to your deployed backend origin (e.g. https://api.qualscore.in) ' +
      'in your Bolt environment panel and rebuild.'
    );
  }
}
