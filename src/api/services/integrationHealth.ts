import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthCategory =
  | 'ai'
  | 'payments'
  | 'whatsapp'
  | 'email'
  | 'crm'
  | 'analytics'
  | 'storage'
  | 'scheduling';

export type TestStatus = 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'SKIPPED' | 'PENDING';
export type HealthStatus = 'healthy' | 'warning' | 'timeout' | 'failed' | 'not_configured';

export interface HealthTestResult {
  id: string;
  category: HealthCategory;
  provider_table: string;
  provider_id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  test_type: string;
  status: TestStatus;
  response_summary: string | null;
  error_detail: string | null;
  latency_ms: number | null;
  checks_run: Array<{ name: string; passed: boolean; detail?: string }>;
  tested_by_admin_id: string | null;
  tested_by_email: string | null;
  created_at: string;
}

export interface ProviderHealthRecord {
  id: string;
  category: HealthCategory;
  providerTable: string;
  providerCode: string;
  providerName: string;
  environmentMode: string;
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  healthStatus: HealthStatus;
  latestTest: HealthTestResult | null;
}

// ─── Category → table mapping ─────────────────────────────────────────────────

interface ProviderTableDef {
  table: string;
  envCol: string;
  codeCol: string;
  nameCol: string;
  activeCol: string;
  primaryCol: string | null;
  fallbackCol: string | null;
  testType: string;
}

const PROVIDER_TABLES: Record<HealthCategory, ProviderTableDef> = {
  ai:         { table: 'ai_provider_configs',         envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'PROMPT_CALL' },
  payments:   { table: 'payment_provider_configs',    envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'CONFIG_VALIDATION' },
  whatsapp:   { table: 'whatsapp_provider_configs',   envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'TEST_SEND' },
  email:      { table: 'email_provider_configs',      envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'TEST_SEND' },
  crm:        { table: 'crm_provider_configs',        envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'TEST_PUSH' },
  analytics:  { table: 'analytics_provider_configs',  envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: null,         fallbackCol: null,           testType: 'TEST_EVENT' },
  storage:    { table: 'storage_provider_configs',    envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'FILE_READ_WRITE' },
  scheduling: { table: 'scheduling_provider_configs', envCol: 'environment_mode', codeCol: 'provider_code', nameCol: 'provider_name', activeCol: 'is_active', primaryCol: 'is_primary', fallbackCol: 'is_fallback', testType: 'CONNECTION_TEST' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveHealthStatus(isActive: boolean, latestTest: HealthTestResult | null): HealthStatus {
  if (!isActive) return 'not_configured';
  if (!latestTest) return 'warning';
  if (latestTest.status === 'SUCCESS') return 'healthy';
  if (latestTest.status === 'TIMEOUT') return 'timeout';
  return 'failed';
}

function buildTestChecks(
  category: HealthCategory,
  provider: Record<string, unknown>
): Array<{ name: string; passed: boolean; detail?: string }> {
  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];

  checks.push({
    name: 'Provider is active',
    passed: provider.is_active === true,
    detail: provider.is_active ? 'Enabled in config' : 'Provider is disabled',
  });

  const def = PROVIDER_TABLES[category];
  if (def.primaryCol) {
    checks.push({
      name: 'Primary or fallback assigned',
      passed: provider[def.primaryCol] === true || provider[def.fallbackCol!] === true,
      detail: provider[def.primaryCol!] ? 'Set as primary' : provider[def.fallbackCol!] ? 'Set as fallback' : 'Neither primary nor fallback',
    });
  }

  if (category === 'ai') {
    const hasKey = !!(provider.api_key_masked as string);
    checks.push({ name: 'API key configured', passed: hasKey, detail: hasKey ? 'Key is present (masked)' : 'No API key set' });
    const model = provider.model_name as string;
    checks.push({ name: 'Model name set', passed: !!model, detail: model || 'No model name configured' });
  }

  if (category === 'payments') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 'razorpay') {
      const hasKeyId = !!(provider.razorpay_key_id as string);
      const hasSecret = !!(provider.razorpay_key_secret_masked as string);
      checks.push({ name: 'Razorpay Key ID', passed: hasKeyId, detail: hasKeyId ? 'Key ID present' : 'Missing Key ID' });
      checks.push({ name: 'Razorpay Secret', passed: hasSecret, detail: hasSecret ? 'Secret present (masked)' : 'Missing secret' });
      const liveMode = (provider.environment_mode as string) === 'LIVE';
      const keyId = provider.razorpay_key_id as string ?? '';
      const mismatch = liveMode ? keyId.startsWith('rzp_test_') : keyId.startsWith('rzp_live_');
      checks.push({ name: 'Key/environment match', passed: !mismatch, detail: mismatch ? 'Key prefix does not match environment mode' : 'Key prefix matches environment' });
    } else if (code === 'payu') {
      checks.push({ name: 'PayU Merchant Key', passed: !!(provider.payu_merchant_key_masked as string), detail: (provider.payu_merchant_key_masked as string) ? 'Present (masked)' : 'Missing' });
      checks.push({ name: 'PayU Salt', passed: !!(provider.payu_salt_masked as string), detail: (provider.payu_salt_masked as string) ? 'Present (masked)' : 'Missing' });
    } else {
      checks.push({ name: 'Mock provider — no credentials needed', passed: true, detail: 'Sandbox/mock mode' });
    }
  }

  if (category === 'whatsapp') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 'meta') {
      checks.push({ name: 'Meta Access Token', passed: !!(provider.meta_access_token_masked as string), detail: 'WhatsApp Cloud API token' });
      checks.push({ name: 'Phone Number ID', passed: !!(provider.meta_phone_number_id as string), detail: (provider.meta_phone_number_id as string) || 'Not set' });
    } else if (code === 'twilio') {
      checks.push({ name: 'Twilio Account SID', passed: !!(provider.twilio_account_sid as string) });
      checks.push({ name: 'Twilio Auth Token', passed: !!(provider.twilio_auth_token_masked as string) });
    } else if (code === 'msg91') {
      checks.push({ name: 'Msg91 Auth Key', passed: !!(provider.msg91_auth_key_masked as string) });
    } else {
      checks.push({ name: 'Stub provider — no credentials', passed: true, detail: 'Stub mode; no real sends' });
    }
  }

  if (category === 'email') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 'resend') {
      const hasResendKey = !!(provider.resend_api_key_masked as string) || !!(provider.api_key_masked as string);
      checks.push({ name: 'Resend API Key', passed: hasResendKey, detail: hasResendKey ? 'Present (masked)' : 'Missing — set RESEND_API_KEY' });
      const fromEmail = (provider.sender_email as string) || (provider.from_email as string);
      checks.push({ name: 'From email address', passed: !!fromEmail, detail: fromEmail || 'Not configured' });
    } else if (code === 'sendgrid') {
      const hasSgKey = !!(provider.sendgrid_api_key_masked as string) || !!(provider.api_key_masked as string);
      checks.push({ name: 'SendGrid API Key', passed: hasSgKey, detail: hasSgKey ? 'Present (masked)' : 'Missing' });
      const fromEmail = (provider.sender_email as string) || (provider.from_email as string);
      checks.push({ name: 'From email address', passed: !!fromEmail, detail: fromEmail || 'Not configured' });
    } else if (code === 'smtp') {
      checks.push({ name: 'SMTP Host', passed: !!(provider.smtp_host as string), detail: (provider.smtp_host as string) || 'Not set' });
      checks.push({ name: 'SMTP Port', passed: !!(provider.smtp_port as number), detail: provider.smtp_port ? `Port ${provider.smtp_port}` : 'Not set' });
    } else {
      checks.push({ name: 'Stub provider — no credentials needed', passed: true, detail: 'Stub mode; no real sends' });
    }
  }

  if (category === 'crm') {
    const hasAuth = !!(provider.auth_token_masked as string) || !!(provider.api_key_masked as string);
    checks.push({ name: 'Auth credential set', passed: hasAuth, detail: hasAuth ? 'Token/key present' : 'No auth token or API key configured' });
    const hasUrl = !!(provider.base_url as string) || !!(provider.instance_url as string);
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code !== 'stub' && code !== 'webhook') {
      checks.push({ name: 'Base / instance URL', passed: hasUrl, detail: hasUrl ? (provider.base_url as string || provider.instance_url as string) : 'Not set' });
    }
  }

  if (category === 'analytics') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 'ga4') {
      checks.push({ name: 'GA4 Measurement ID', passed: !!(provider.ga4_measurement_id as string), detail: (provider.ga4_measurement_id as string) || 'Not set' });
      checks.push({ name: 'GA4 API Secret', passed: !!(provider.ga4_api_secret_masked as string) });
    } else if (code === 'meta_pixel') {
      checks.push({ name: 'Pixel ID', passed: !!(provider.pixel_id as string) });
    } else if (code === 'mixpanel') {
      checks.push({ name: 'Mixpanel Token', passed: !!(provider.project_token as string) });
    } else {
      checks.push({ name: 'Stub provider', passed: true, detail: 'No credentials needed' });
    }
  }

  if (category === 'storage') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 's3') {
      checks.push({ name: 'S3 Access Key ID', passed: !!(provider.access_key_id_masked as string) });
      checks.push({ name: 'S3 Bucket name', passed: !!(provider.bucket_name as string) });
      checks.push({ name: 'AWS Region', passed: !!(provider.region as string) });
    } else if (code === 'supabase_storage') {
      checks.push({ name: 'Bucket configured', passed: !!(provider.bucket_name as string) });
    } else {
      checks.push({ name: 'Provider configured', passed: true, detail: 'No specific credentials needed' });
    }
  }

  if (category === 'scheduling') {
    const code = (provider.provider_code as string ?? '').toLowerCase();
    if (code === 'calendly') {
      checks.push({ name: 'Calendly API Token', passed: !!(provider.api_token_masked as string) });
      checks.push({ name: 'Scheduling URL', passed: !!(provider.scheduling_url as string), detail: (provider.scheduling_url as string) || 'Not set' });
    } else if (code === 'google_calendar') {
      checks.push({ name: 'Google Client ID', passed: !!(provider.google_client_id as string) });
    } else {
      checks.push({ name: 'Stub provider', passed: true });
    }
  }

  return checks;
}

// ─── Persist test result ──────────────────────────────────────────────────────

async function saveTestResult(params: {
  category: HealthCategory;
  providerTableDef: ProviderTableDef;
  provider: Record<string, unknown>;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  adminEmail: string;
  adminId?: string;
}): Promise<HealthTestResult> {
  const { category, providerTableDef, provider, checks, adminEmail, adminId } = params;
  const allPassed = checks.every((c) => c.passed);
  const failCount = checks.filter((c) => !c.passed).length;
  const status: TestStatus = allPassed ? 'SUCCESS' : 'FAILURE';
  const summary = allPassed
    ? `All ${checks.length} checks passed.`
    : `${failCount} of ${checks.length} checks failed. First failure: ${checks.find((c) => !c.passed)?.name}`;

  const { data, error } = await supabase
    .from('integration_health_tests')
    .insert({
      category,
      provider_table: providerTableDef.table,
      provider_id: provider.id as string,
      provider_code: provider[providerTableDef.codeCol] as string,
      provider_name: provider[providerTableDef.nameCol] as string,
      environment_mode: provider[providerTableDef.envCol] as string ?? 'SANDBOX',
      test_type: providerTableDef.testType,
      status,
      response_summary: summary,
      error_detail: allPassed ? null : checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.detail ?? 'failed'}`).join('; '),
      latency_ms: null,
      checks_run: checks,
      tested_by_admin_id: adminId ?? null,
      tested_by_email: adminEmail,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as HealthTestResult;
}

// ─── Fetch latest test per provider ──────────────────────────────────────────

async function getLatestTestsMap(providerIds: string[]): Promise<Map<string, HealthTestResult>> {
  if (providerIds.length === 0) return new Map();

  const { data } = await supabase
    .from('integration_health_tests')
    .select('*')
    .in('provider_id', providerIds)
    .order('created_at', { ascending: false });

  const map = new Map<string, HealthTestResult>();
  for (const row of (data ?? []) as HealthTestResult[]) {
    if (!map.has(row.provider_id)) {
      map.set(row.provider_id, row);
    }
  }
  return map;
}

// ─── List all providers with health ──────────────────────────────────────────

async function listAllProviders(): Promise<ProviderHealthRecord[]> {
  const categories = Object.keys(PROVIDER_TABLES) as HealthCategory[];

  const allProviders: ProviderHealthRecord[] = [];

  await Promise.all(
    categories.map(async (cat) => {
      const def = PROVIDER_TABLES[cat];
      const cols = ['id', def.codeCol, def.nameCol, def.envCol, def.activeCol, def.primaryCol, def.fallbackCol]
        .filter(Boolean)
        .join(', ');

      const { data } = await supabase
        .from(def.table)
        .select(cols)
        .order('display_order', { ascending: true });

      for (const row of (data ?? []) as Record<string, unknown>[]) {
        allProviders.push({
          id: row.id as string,
          category: cat,
          providerTable: def.table,
          providerCode: row[def.codeCol] as string,
          providerName: row[def.nameCol] as string,
          environmentMode: row[def.envCol] as string ?? 'SANDBOX',
          isActive: row[def.activeCol] === true,
          isPrimary: def.primaryCol ? row[def.primaryCol] === true : false,
          isFallback: def.fallbackCol ? row[def.fallbackCol] === true : false,
          healthStatus: 'warning',
          latestTest: null,
        });
      }
    })
  );

  const providerIds = allProviders.map((p) => p.id);
  const latestTests = await getLatestTestsMap(providerIds);

  for (const p of allProviders) {
    p.latestTest = latestTests.get(p.id) ?? null;
    p.healthStatus = deriveHealthStatus(p.isActive, p.latestTest);
  }

  return allProviders;
}

// ─── Run test for a single provider ──────────────────────────────────────────

async function runTest(
  category: HealthCategory,
  providerId: string,
  adminEmail: string,
  adminId?: string
): Promise<HealthTestResult> {
  const def = PROVIDER_TABLES[category];

  const { data: providerRow, error } = await supabase
    .from(def.table)
    .select('*')
    .eq('id', providerId)
    .maybeSingle();

  if (error || !providerRow) {
    throw new Error(`Provider not found: ${providerId} in ${def.table}`);
  }

  const checks = buildTestChecks(category, providerRow as Record<string, unknown>);

  return saveTestResult({
    category,
    providerTableDef: def,
    provider: providerRow as Record<string, unknown>,
    checks,
    adminEmail,
    adminId,
  });
}

// ─── Bulk run — test all active providers ─────────────────────────────────────

async function runAllTests(
  adminEmail: string,
  adminId?: string
): Promise<{ results: HealthTestResult[]; errors: string[] }> {
  const providers = await listAllProviders();
  const active = providers.filter((p) => p.isActive);

  const results: HealthTestResult[] = [];
  const errors: string[] = [];

  await Promise.all(
    active.map(async (p) => {
      try {
        const result = await runTest(p.category, p.id, adminEmail, adminId);
        results.push(result);
      } catch (err) {
        errors.push(`${p.providerName} (${p.category}): ${(err as Error).message}`);
      }
    })
  );

  return { results, errors };
}

// ─── Test history for one provider ───────────────────────────────────────────

async function getProviderTestHistory(
  providerId: string,
  limit = 20
): Promise<HealthTestResult[]> {
  const { data } = await supabase
    .from('integration_health_tests')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as HealthTestResult[];
}

// ─── Overall health summary ───────────────────────────────────────────────────

async function getHealthSummary(): Promise<{
  total: number;
  healthy: number;
  warning: number;
  failed: number;
  notConfigured: number;
  byCategory: Record<string, { total: number; healthy: number; failed: number }>;
}> {
  const providers = await listAllProviders();

  const summary = {
    total: providers.length,
    healthy: providers.filter((p) => p.healthStatus === 'healthy').length,
    warning: providers.filter((p) => p.healthStatus === 'warning').length,
    failed: providers.filter((p) => p.healthStatus === 'failed').length,
    notConfigured: providers.filter((p) => p.healthStatus === 'not_configured').length,
    byCategory: {} as Record<string, { total: number; healthy: number; failed: number }>,
  };

  for (const p of providers) {
    if (!summary.byCategory[p.category]) summary.byCategory[p.category] = { total: 0, healthy: 0, failed: 0 };
    summary.byCategory[p.category].total++;
    if (p.healthStatus === 'healthy') summary.byCategory[p.category].healthy++;
    if (p.healthStatus === 'failed') summary.byCategory[p.category].failed++;
  }

  return summary;
}

export const integrationHealthApi = {
  listAllProviders,
  runTest,
  runAllTests,
  getProviderTestHistory,
  getHealthSummary,
  PROVIDER_TABLES,
};

export type { ProviderTableDef };
