import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderCategory =
  | 'ai'
  | 'payments'
  | 'whatsapp'
  | 'email'
  | 'crm'
  | 'analytics'
  | 'storage'
  | 'scheduling';

export type EnvironmentMode = 'SANDBOX' | 'LIVE';
export type ResolutionStatus = 'RESOLVED' | 'FALLBACK' | 'NO_PROVIDER' | 'DISABLED';

export interface ResolvedProvider {
  id: string;
  providerCode: string;
  providerName: string;
  isFallback: boolean;
  environmentMode: EnvironmentMode;
}

export interface ResolutionResult {
  status: ResolutionStatus;
  provider: ResolvedProvider | null;
  reason: string;
}

export interface ResolutionLogEntry {
  id: string;
  category: string;
  environment_mode: string;
  resolved_provider_id: string | null;
  resolved_provider_code: string | null;
  resolved_provider_name: string | null;
  was_fallback: boolean;
  resolution_status: string;
  resolution_reason: string | null;
  trigger_context: string | null;
  caller_ref: string | null;
  created_at: string;
}

// ─── Table mappings ───────────────────────────────────────────────────────────
// Maps category → {table, activeCol, primaryCol, fallbackCol}

interface TableMap {
  table: string;
  activeCol: string;
  primaryCol: string | null;
  fallbackCol: string | null;
  envCol: string;
  codeCol: string;
  nameCol: string;
}

const CATEGORY_TABLE_MAP: Record<ProviderCategory, TableMap> = {
  ai: {
    table: 'ai_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  payments: {
    table: 'payment_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  whatsapp: {
    table: 'whatsapp_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  email: {
    table: 'email_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  crm: {
    table: 'crm_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  analytics: {
    table: 'analytics_provider_configs',
    activeCol: 'is_active',
    primaryCol: null,
    fallbackCol: null,
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  storage: {
    table: 'storage_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
  scheduling: {
    table: 'scheduling_provider_configs',
    activeCol: 'is_active',
    primaryCol: 'is_primary',
    fallbackCol: 'is_fallback',
    envCol: 'environment_mode',
    codeCol: 'provider_code',
    nameCol: 'provider_name',
  },
};

// ─── Log helper ───────────────────────────────────────────────────────────────

function writeResolutionLog(params: {
  category: ProviderCategory;
  environmentMode: EnvironmentMode;
  result: ResolutionResult;
  triggerContext?: string;
  callerRef?: string;
}): void {
  const { category, environmentMode, result, triggerContext, callerRef } = params;
  supabase.from('provider_resolution_logs').insert({
    category,
    environment_mode: environmentMode,
    resolved_provider_id: result.provider?.id ?? null,
    resolved_provider_code: result.provider?.providerCode ?? null,
    resolved_provider_name: result.provider?.providerName ?? null,
    was_fallback: result.provider?.isFallback ?? false,
    resolution_status: result.status,
    resolution_reason: result.reason,
    trigger_context: triggerContext ?? null,
    caller_ref: callerRef ?? null,
  }).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn('[ProviderResolution] Failed to write resolution log:', error.message);
    }
  });
}

// ─── Core resolution ──────────────────────────────────────────────────────────

async function resolveProvider(
  category: ProviderCategory,
  environmentMode: EnvironmentMode,
  opts: { log?: boolean; triggerContext?: string; callerRef?: string } = {}
): Promise<ResolutionResult> {
  const map = CATEGORY_TABLE_MAP[category];
  if (!map) {
    return { status: 'NO_PROVIDER', provider: null, reason: `Unknown category: ${category}` };
  }

  const selectCols = `id, ${map.codeCol}, ${map.nameCol}, ${map.envCol}${map.primaryCol ? `, ${map.primaryCol}` : ''}${map.fallbackCol ? `, ${map.fallbackCol}` : ''}`;

  // 1. Try primary
  if (map.primaryCol) {
    const { data: primary } = await supabase
      .from(map.table)
      .select(selectCols)
      .eq(map.activeCol, true)
      .eq(map.primaryCol, true)
      .eq(map.envCol, environmentMode)
      .maybeSingle();

    if (primary) {
      const result: ResolutionResult = {
        status: 'RESOLVED',
        provider: {
          id: primary.id,
          providerCode: primary[map.codeCol],
          providerName: primary[map.nameCol],
          isFallback: false,
          environmentMode,
        },
        reason: 'Primary provider resolved',
      };
      if (opts.log) writeResolutionLog({ category, environmentMode, result, triggerContext: opts.triggerContext, callerRef: opts.callerRef });
      return result;
    }
  }

  // 2. Try fallback (if applicable)
  if (map.fallbackCol) {
    const { data: fallback } = await supabase
      .from(map.table)
      .select(selectCols)
      .eq(map.activeCol, true)
      .eq(map.fallbackCol, true)
      .eq(map.envCol, environmentMode)
      .maybeSingle();

    if (fallback) {
      const result: ResolutionResult = {
        status: 'FALLBACK',
        provider: {
          id: fallback.id,
          providerCode: fallback[map.codeCol],
          providerName: fallback[map.nameCol],
          isFallback: true,
          environmentMode,
        },
        reason: 'No primary found; fallback provider used',
      };
      if (opts.log) writeResolutionLog({ category, environmentMode, result, triggerContext: opts.triggerContext, callerRef: opts.callerRef });
      return result;
    }
  }

  // 3. Analytics: any active provider (fan-out, no primary concept)
  if (!map.primaryCol) {
    const { data: anyActive } = await supabase
      .from(map.table)
      .select(selectCols)
      .eq(map.activeCol, true)
      .eq(map.envCol, environmentMode)
      .limit(1)
      .maybeSingle();

    if (anyActive) {
      const result: ResolutionResult = {
        status: 'RESOLVED',
        provider: {
          id: anyActive.id,
          providerCode: anyActive[map.codeCol],
          providerName: anyActive[map.nameCol],
          isFallback: false,
          environmentMode,
        },
        reason: 'Active provider found (fan-out category)',
      };
      if (opts.log) writeResolutionLog({ category, environmentMode, result, triggerContext: opts.triggerContext, callerRef: opts.callerRef });
      return result;
    }
  }

  // 4. Nothing found
  const result: ResolutionResult = {
    status: 'NO_PROVIDER',
    provider: null,
    reason: `No active provider found for category=${category} env=${environmentMode}`,
  };
  if (opts.log) await writeResolutionLog({ category, environmentMode, result, triggerContext: opts.triggerContext, callerRef: opts.callerRef });
  return result;
}

// Resolve all active analytics providers (fan-out)
async function resolveAllAnalyticsProviders(
  environmentMode: EnvironmentMode
): Promise<ResolvedProvider[]> {
  const map = CATEGORY_TABLE_MAP.analytics;
  const { data } = await supabase
    .from(map.table)
    .select(`id, ${map.codeCol}, ${map.nameCol}, ${map.envCol}`)
    .eq(map.activeCol, true)
    .eq(map.envCol, environmentMode);

  return (data ?? []).map((r) => ({
    id: r.id,
    providerCode: r[map.codeCol],
    providerName: r[map.nameCol],
    isFallback: false,
    environmentMode,
  }));
}

// ─── Logs API ─────────────────────────────────────────────────────────────────

async function getResolutionLogs(
  filters: { category?: ProviderCategory; limit?: number } = {}
): Promise<ResolutionLogEntry[]> {
  let query = supabase
    .from('provider_resolution_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data } = await query;
  return data ?? [];
}

async function getResolutionLogStats(): Promise<{
  total: number;
  resolved: number;
  fallback: number;
  noProvider: number;
  byCategory: Record<string, { total: number; fallback: number; noProvider: number }>;
}> {
  const { data } = await supabase
    .from('provider_resolution_logs')
    .select('category, resolution_status, was_fallback')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const rows = data ?? [];
  const stats = {
    total: rows.length,
    resolved: rows.filter((r) => r.resolution_status === 'RESOLVED').length,
    fallback: rows.filter((r) => r.was_fallback).length,
    noProvider: rows.filter((r) => r.resolution_status === 'NO_PROVIDER').length,
    byCategory: {} as Record<string, { total: number; fallback: number; noProvider: number }>,
  };

  for (const row of rows) {
    if (!stats.byCategory[row.category]) {
      stats.byCategory[row.category] = { total: 0, fallback: 0, noProvider: 0 };
    }
    stats.byCategory[row.category].total++;
    if (row.was_fallback) stats.byCategory[row.category].fallback++;
    if (row.resolution_status === 'NO_PROVIDER') stats.byCategory[row.category].noProvider++;
  }

  return stats;
}

// ─── Current provider snapshot (for dashboard display) ───────────────────────

export interface CategoryProviderSnapshot {
  category: ProviderCategory;
  label: string;
  primaryProvider: ResolvedProvider | null;
  fallbackProvider: ResolvedProvider | null;
  allActiveCount: number;
  hasNoProvider: boolean;
}

async function getCategorySnapshot(
  environmentMode: EnvironmentMode
): Promise<CategoryProviderSnapshot[]> {
  const categories: ProviderCategory[] = [
    'ai', 'payments', 'whatsapp', 'email', 'crm', 'analytics', 'storage', 'scheduling',
  ];

  const LABELS: Record<ProviderCategory, string> = {
    ai: 'AI / LLM',
    payments: 'Payments',
    whatsapp: 'WhatsApp',
    email: 'Email',
    crm: 'CRM',
    analytics: 'Analytics',
    storage: 'Storage',
    scheduling: 'Scheduling',
  };

  const results = await Promise.all(
    categories.map(async (cat): Promise<CategoryProviderSnapshot> => {
      const map = CATEGORY_TABLE_MAP[cat];
      const selectCols = `id, ${map.codeCol}, ${map.nameCol}${map.primaryCol ? `, ${map.primaryCol}` : ''}${map.fallbackCol ? `, ${map.fallbackCol}` : ''}`;

      const { data: allActive } = await supabase
        .from(map.table)
        .select(selectCols)
        .eq(map.activeCol, true)
        .eq(map.envCol, environmentMode);

      const rows = allActive ?? [];

      const primaryRow = map.primaryCol
        ? rows.find((r) => r[map.primaryCol!] === true) ?? null
        : null;
      const fallbackRow = map.fallbackCol
        ? rows.find((r) => r[map.fallbackCol!] === true && r[map.primaryCol ?? ''] !== true) ?? null
        : null;

      const toResolved = (r: Record<string, unknown>, isFallback: boolean): ResolvedProvider => ({
        id: r.id as string,
        providerCode: r[map.codeCol] as string,
        providerName: r[map.nameCol] as string,
        isFallback,
        environmentMode,
      });

      return {
        category: cat,
        label: LABELS[cat],
        primaryProvider: primaryRow ? toResolved(primaryRow, false) : null,
        fallbackProvider: fallbackRow ? toResolved(fallbackRow, true) : null,
        allActiveCount: rows.length,
        hasNoProvider: rows.length === 0,
      };
    })
  );

  return results;
}

// ─── Exported API ─────────────────────────────────────────────────────────────

export const providerResolutionApi = {
  resolve: resolveProvider,
  resolveAllAnalytics: resolveAllAnalyticsProviders,
  getLogs: getResolutionLogs,
  getStats: getResolutionLogStats,
  getCategorySnapshot,
  writeLog: writeResolutionLog,
};
