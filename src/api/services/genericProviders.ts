import { supabase } from '../../lib/supabase';

// ─── Shared ───────────────────────────────────────────────────────────────────

export type GenericCategory = 'crm' | 'analytics' | 'storage' | 'scheduling';

export interface GenericTestLog {
  id: string;
  category: GenericCategory;
  provider_config_id: string;
  tested_by_admin_id: string | null;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'PENDING';
  summary: string | null;
  checks_run: Array<{ name: string; passed: boolean; detail?: string }>;
  created_at: string;
}

function mask(raw: string): string {
  if (!raw || raw.length < 6) return '••••••••';
  return raw.slice(0, 4) + '••••••••' + raw.slice(-4);
}

async function saveTestLog(
  category: GenericCategory,
  providerId: string,
  adminId: string,
  checks: GenericTestLog['checks_run'],
  status: GenericTestLog['status'],
): Promise<GenericTestLog> {
  const summary = status === 'PASS'
    ? `All ${checks.length} checks passed.`
    : `${checks.filter((c) => !c.passed).length} of ${checks.length} checks failed.`;
  const { data, error } = await supabase
    .from('generic_provider_test_logs')
    .insert({ category, provider_config_id: providerId, tested_by_admin_id: adminId, status, summary, checks_run: checks })
    .select().single();
  if (error) throw error;
  return data as GenericTestLog;
}

async function getTestLogs(category: GenericCategory, providerId: string): Promise<GenericTestLog[]> {
  const { data } = await supabase
    .from('generic_provider_test_logs')
    .select('*')
    .eq('provider_config_id', providerId)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as GenericTestLog[];
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export interface CrmProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;
  base_url: string | null;
  instance_url: string | null;
  auth_token_masked: string | null;
  client_id: string | null;
  client_secret_masked: string | null;
  api_key_masked: string | null;
  mapping_mode: string;
  sync_contact: boolean;
  sync_deal: boolean;
  sync_activity: boolean;
  pipeline_id: string | null;
  owner_id: string | null;
  custom_field_mappings: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmProviderSave {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;
  base_url?: string;
  instance_url?: string;
  auth_token_raw?: string;
  client_id?: string;
  client_secret_raw?: string;
  api_key_raw?: string;
  mapping_mode?: string;
  sync_contact?: boolean;
  sync_deal?: boolean;
  sync_activity?: boolean;
  pipeline_id?: string;
  owner_id?: string;
  custom_field_mappings?: Record<string, unknown>;
  notes?: string;
}

const CRM_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order',
  'base_url,instance_url,auth_token_masked,client_id,client_secret_masked,api_key_masked',
  'mapping_mode,sync_contact,sync_deal,sync_activity,pipeline_id,owner_id,custom_field_mappings',
  'notes,created_at,updated_at',
].join(',');

export const crmProviderApi = {
  async list(): Promise<CrmProviderConfig[]> {
    const { data, error } = await supabase.from('crm_provider_configs').select(CRM_SELECT).order('display_order');
    if (error) throw error;
    return (data ?? []) as CrmProviderConfig[];
  },
  async get(id: string): Promise<CrmProviderConfig | null> {
    const { data } = await supabase.from('crm_provider_configs').select(CRM_SELECT).eq('id', id).maybeSingle();
    return data as CrmProviderConfig | null;
  },
  async create(p: CrmProviderSave): Promise<CrmProviderConfig> {
    const { auth_token_raw, client_secret_raw, api_key_raw, ...rest } = p;
    const ins: Record<string, unknown> = { ...rest };
    if (auth_token_raw?.trim()) { ins.auth_token = auth_token_raw.trim(); ins.auth_token_masked = mask(auth_token_raw.trim()); }
    if (client_secret_raw?.trim()) { ins.client_secret = client_secret_raw.trim(); ins.client_secret_masked = mask(client_secret_raw.trim()); }
    if (api_key_raw?.trim()) { ins.api_key = api_key_raw.trim(); ins.api_key_masked = mask(api_key_raw.trim()); }
    const { data, error } = await supabase.from('crm_provider_configs').insert(ins).select(CRM_SELECT).single();
    if (error) throw error;
    return data as CrmProviderConfig;
  },
  async update(id: string, p: Partial<CrmProviderSave>): Promise<CrmProviderConfig> {
    const { auth_token_raw, client_secret_raw, api_key_raw, ...rest } = p;
    const upd: Record<string, unknown> = { ...rest };
    if (auth_token_raw?.trim()) { upd.auth_token = auth_token_raw.trim(); upd.auth_token_masked = mask(auth_token_raw.trim()); }
    if (client_secret_raw?.trim()) { upd.client_secret = client_secret_raw.trim(); upd.client_secret_masked = mask(client_secret_raw.trim()); }
    if (api_key_raw?.trim()) { upd.api_key = api_key_raw.trim(); upd.api_key_masked = mask(api_key_raw.trim()); }
    const { data, error } = await supabase.from('crm_provider_configs').update(upd).eq('id', id).select(CRM_SELECT).single();
    if (error) throw error;
    return data as CrmProviderConfig;
  },
  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase.from('crm_provider_configs').update({ is_primary: false }).eq('environment_mode', envMode).neq('id', id);
    const { error } = await supabase.from('crm_provider_configs').update({ is_primary: true, is_active: true }).eq('id', id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('crm_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },
  async runTest(id: string, adminEmail: string): Promise<GenericTestLog> {
    const { data: row } = await supabase.from('crm_provider_configs').select('*').eq('id', id).maybeSingle();
    const checks: GenericTestLog['checks_run'] = [];
    if (!row) return saveTestLog('crm', id, adminEmail, [{ name: 'Record exists', passed: false, detail: 'Provider not found' }], 'FAIL');
    const code = row.provider_code as string;
    if (code === 'stub') {
      checks.push({ name: 'Provider type', passed: true, detail: 'Stub — logs to console, no credentials needed' });
      checks.push({ name: 'Active', passed: row.is_active, detail: row.is_active ? 'Active' : 'Disabled' });
    } else if (code === 'webhook') {
      const hasUrl = Boolean(row.base_url?.trim());
      checks.push({ name: 'Webhook URL configured', passed: hasUrl, detail: hasUrl ? row.base_url : 'Missing — set the webhook endpoint URL' });
      if (row.auth_token) checks.push({ name: 'Auth token present', passed: true, detail: 'Stored (masked)' });
    } else if (code === 'zoho') {
      checks.push({ name: 'Client ID set', passed: Boolean(row.client_id?.trim()), detail: row.client_id || 'Missing' });
      checks.push({ name: 'Client secret set', passed: Boolean(row.client_secret), detail: row.client_secret ? 'Stored (masked)' : 'Missing' });
      checks.push({ name: 'Instance URL', passed: Boolean(row.instance_url?.trim()), detail: row.instance_url || 'e.g. https://crm.zoho.in' });
    } else if (code === 'hubspot') {
      checks.push({ name: 'API key set', passed: Boolean(row.api_key), detail: row.api_key ? 'Stored (masked)' : 'Missing' });
      checks.push({ name: 'Base URL', passed: Boolean(row.base_url?.trim()), detail: row.base_url || 'e.g. https://api.hubapi.com' });
    } else if (code === 'salesforce') {
      checks.push({ name: 'Client ID', passed: Boolean(row.client_id?.trim()), detail: row.client_id || 'Missing' });
      checks.push({ name: 'Client secret', passed: Boolean(row.client_secret), detail: row.client_secret ? 'Stored (masked)' : 'Missing' });
      checks.push({ name: 'Instance URL', passed: Boolean(row.instance_url?.trim()), detail: row.instance_url || 'e.g. https://yourinstance.salesforce.com' });
    } else {
      checks.push({ name: 'Provider recognized', passed: false, detail: `Unknown: ${code}` });
    }
    const status: GenericTestLog['status'] = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    return saveTestLog('crm', id, adminEmail, checks, status);
  },
  getTestLogs: (id: string) => getTestLogs('crm', id),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  display_order: number;
  measurement_id: string | null;
  api_secret_masked: string | null;
  pixel_id: string | null;
  access_token_masked: string | null;
  test_event_code: string | null;
  mixpanel_token_masked: string | null;
  mixpanel_region: string | null;
  event_mappings: Record<string, string>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsProviderSave {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  display_order?: number;
  measurement_id?: string;
  api_secret_raw?: string;
  pixel_id?: string;
  access_token_raw?: string;
  test_event_code?: string;
  mixpanel_token_raw?: string;
  mixpanel_region?: string;
  event_mappings?: Record<string, string>;
  notes?: string;
}

const ANALYTICS_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,display_order',
  'measurement_id,api_secret_masked,pixel_id,access_token_masked,test_event_code',
  'mixpanel_token_masked,mixpanel_region,event_mappings,notes,created_at,updated_at',
].join(',');

export const analyticsProviderConfigApi = {
  async list(): Promise<AnalyticsProviderConfig[]> {
    const { data, error } = await supabase.from('analytics_provider_configs').select(ANALYTICS_SELECT).order('display_order');
    if (error) throw error;
    return (data ?? []) as AnalyticsProviderConfig[];
  },
  async get(id: string): Promise<AnalyticsProviderConfig | null> {
    const { data } = await supabase.from('analytics_provider_configs').select(ANALYTICS_SELECT).eq('id', id).maybeSingle();
    return data as AnalyticsProviderConfig | null;
  },
  async create(p: AnalyticsProviderSave): Promise<AnalyticsProviderConfig> {
    const { api_secret_raw, access_token_raw, mixpanel_token_raw, ...rest } = p;
    const ins: Record<string, unknown> = { ...rest };
    if (api_secret_raw?.trim()) { ins.api_secret = api_secret_raw.trim(); ins.api_secret_masked = mask(api_secret_raw.trim()); }
    if (access_token_raw?.trim()) { ins.access_token = access_token_raw.trim(); ins.access_token_masked = mask(access_token_raw.trim()); }
    if (mixpanel_token_raw?.trim()) { ins.mixpanel_token = mixpanel_token_raw.trim(); ins.mixpanel_token_masked = mask(mixpanel_token_raw.trim()); }
    const { data, error } = await supabase.from('analytics_provider_configs').insert(ins).select(ANALYTICS_SELECT).single();
    if (error) throw error;
    return data as AnalyticsProviderConfig;
  },
  async update(id: string, p: Partial<AnalyticsProviderSave>): Promise<AnalyticsProviderConfig> {
    const { api_secret_raw, access_token_raw, mixpanel_token_raw, ...rest } = p;
    const upd: Record<string, unknown> = { ...rest };
    if (api_secret_raw?.trim()) { upd.api_secret = api_secret_raw.trim(); upd.api_secret_masked = mask(api_secret_raw.trim()); }
    if (access_token_raw?.trim()) { upd.access_token = access_token_raw.trim(); upd.access_token_masked = mask(access_token_raw.trim()); }
    if (mixpanel_token_raw?.trim()) { upd.mixpanel_token = mixpanel_token_raw.trim(); upd.mixpanel_token_masked = mask(mixpanel_token_raw.trim()); }
    const { data, error } = await supabase.from('analytics_provider_configs').update(upd).eq('id', id).select(ANALYTICS_SELECT).single();
    if (error) throw error;
    return data as AnalyticsProviderConfig;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('analytics_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },
  async runTest(id: string, adminEmail: string): Promise<GenericTestLog> {
    const { data: row } = await supabase.from('analytics_provider_configs').select('*').eq('id', id).maybeSingle();
    const checks: GenericTestLog['checks_run'] = [];
    if (!row) return saveTestLog('analytics', id, adminEmail, [{ name: 'Record exists', passed: false }], 'FAIL');
    const code = row.provider_code as string;
    if (code === 'stub') {
      checks.push({ name: 'Stub provider', passed: true, detail: 'Logs events to console only' });
    } else if (code === 'ga4') {
      const hasId = Boolean(row.measurement_id?.trim());
      const fmtOk = hasId && (row.measurement_id as string).startsWith('G-');
      checks.push({ name: 'Measurement ID set', passed: hasId, detail: hasId ? row.measurement_id : 'Missing — find at GA4 Admin → Data Streams' });
      checks.push({ name: 'Measurement ID format', passed: fmtOk, detail: fmtOk ? 'Starts with G-' : 'Should start with G-' });
      if (row.api_secret) checks.push({ name: 'API Secret (Measurement Protocol)', passed: true, detail: 'Stored — used for server-side events' });
    } else if (code === 'meta_pixel') {
      const hasPixelId = Boolean(row.pixel_id?.trim());
      const idNumeric = hasPixelId && /^\d{10,20}$/.test(row.pixel_id ?? '');
      checks.push({ name: 'Pixel ID set', passed: hasPixelId, detail: hasPixelId ? row.pixel_id : 'Missing — find in Meta Events Manager' });
      checks.push({ name: 'Pixel ID format', passed: idNumeric, detail: idNumeric ? 'Numeric ID' : 'Should be a 10-20 digit numeric ID' });
      if (row.access_token) checks.push({ name: 'CAPI access token', passed: true, detail: 'Stored — used for Conversions API' });
    } else if (code === 'mixpanel') {
      const hasToken = Boolean(row.mixpanel_token);
      checks.push({ name: 'Project token set', passed: hasToken, detail: hasToken ? 'Stored (masked)' : 'Missing — find at Mixpanel Settings → Project' });
      checks.push({ name: 'Region', passed: Boolean(row.mixpanel_region), detail: row.mixpanel_region || 'US or EU' });
    } else {
      checks.push({ name: 'Provider recognized', passed: false, detail: `Unknown: ${code}` });
    }
    const status: GenericTestLog['status'] = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    return saveTestLog('analytics', id, adminEmail, checks, status);
  },
  getTestLogs: (id: string) => getTestLogs('analytics', id),
};

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface StorageProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;
  bucket_name: string | null;
  region: string | null;
  access_key_id: string | null;
  secret_access_key_masked: string | null;
  endpoint_url: string | null;
  public_base_url: string | null;
  key_prefix: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageProviderSave {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;
  bucket_name?: string;
  region?: string;
  access_key_id?: string;
  secret_access_key_raw?: string;
  endpoint_url?: string;
  public_base_url?: string;
  key_prefix?: string;
  notes?: string;
}

const STORAGE_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order',
  'bucket_name,region,access_key_id,secret_access_key_masked,endpoint_url,public_base_url,key_prefix',
  'notes,created_at,updated_at',
].join(',');

export const storageProviderApi = {
  async list(): Promise<StorageProviderConfig[]> {
    const { data, error } = await supabase.from('storage_provider_configs').select(STORAGE_SELECT).order('display_order');
    if (error) throw error;
    return (data ?? []) as StorageProviderConfig[];
  },
  async get(id: string): Promise<StorageProviderConfig | null> {
    const { data } = await supabase.from('storage_provider_configs').select(STORAGE_SELECT).eq('id', id).maybeSingle();
    return data as StorageProviderConfig | null;
  },
  async create(p: StorageProviderSave): Promise<StorageProviderConfig> {
    const { secret_access_key_raw, ...rest } = p;
    const ins: Record<string, unknown> = { ...rest };
    if (secret_access_key_raw?.trim()) { ins.secret_access_key = secret_access_key_raw.trim(); ins.secret_access_key_masked = mask(secret_access_key_raw.trim()); }
    const { data, error } = await supabase.from('storage_provider_configs').insert(ins).select(STORAGE_SELECT).single();
    if (error) throw error;
    return data as StorageProviderConfig;
  },
  async update(id: string, p: Partial<StorageProviderSave>): Promise<StorageProviderConfig> {
    const { secret_access_key_raw, ...rest } = p;
    const upd: Record<string, unknown> = { ...rest };
    if (secret_access_key_raw?.trim()) { upd.secret_access_key = secret_access_key_raw.trim(); upd.secret_access_key_masked = mask(secret_access_key_raw.trim()); }
    const { data, error } = await supabase.from('storage_provider_configs').update(upd).eq('id', id).select(STORAGE_SELECT).single();
    if (error) throw error;
    return data as StorageProviderConfig;
  },
  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase.from('storage_provider_configs').update({ is_primary: false }).eq('environment_mode', envMode).neq('id', id);
    const { error } = await supabase.from('storage_provider_configs').update({ is_primary: true, is_active: true }).eq('id', id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('storage_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },
  async runTest(id: string, adminEmail: string): Promise<GenericTestLog> {
    const { data: row } = await supabase.from('storage_provider_configs').select('*').eq('id', id).maybeSingle();
    const checks: GenericTestLog['checks_run'] = [];
    if (!row) return saveTestLog('storage', id, adminEmail, [{ name: 'Record exists', passed: false }], 'FAIL');
    const code = row.provider_code as string;
    if (code === 'supabase_storage') {
      checks.push({ name: 'Provider type', passed: true, detail: 'Supabase Storage — built-in, no external credentials needed' });
      const hasBucket = Boolean(row.bucket_name?.trim());
      checks.push({ name: 'Bucket name set', passed: hasBucket, detail: hasBucket ? row.bucket_name : 'Optional — defaults to platform bucket' });
    } else if (code === 's3') {
      checks.push({ name: 'Bucket name', passed: Boolean(row.bucket_name?.trim()), detail: row.bucket_name || 'Missing' });
      checks.push({ name: 'AWS region', passed: Boolean(row.region?.trim()), detail: row.region || 'e.g. ap-south-1' });
      checks.push({ name: 'Access key ID', passed: Boolean(row.access_key_id?.trim()), detail: row.access_key_id || 'Missing' });
      checks.push({ name: 'Secret access key', passed: Boolean(row.secret_access_key), detail: row.secret_access_key ? 'Stored (masked)' : 'Missing' });
    } else if (code === 'local') {
      checks.push({ name: 'Provider type', passed: true, detail: 'Local filesystem — only suitable for development' });
    } else if (code === 'stub') {
      checks.push({ name: 'Stub provider', passed: true, detail: 'No-op stub for testing' });
    } else {
      checks.push({ name: 'Provider recognized', passed: false, detail: `Unknown: ${code}` });
    }
    const status: GenericTestLog['status'] = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    return saveTestLog('storage', id, adminEmail, checks, status);
  },
  getTestLogs: (id: string) => getTestLogs('storage', id),
};

// ─── Scheduling ───────────────────────────────────────────────────────────────

export interface SchedulingProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;
  calendar_id: string | null;
  oauth_access_token_masked: string | null;
  oauth_refresh_token_masked: string | null;
  api_key_masked: string | null;
  webhook_signing_secret_masked: string | null;
  booking_url: string | null;
  event_type_uri: string | null;
  timezone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchedulingProviderSave {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;
  calendar_id?: string;
  oauth_access_token_raw?: string;
  oauth_refresh_token_raw?: string;
  api_key_raw?: string;
  webhook_signing_secret_raw?: string;
  booking_url?: string;
  event_type_uri?: string;
  timezone?: string;
  notes?: string;
}

const SCHEDULING_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order',
  'calendar_id,oauth_access_token_masked,oauth_refresh_token_masked',
  'api_key_masked,webhook_signing_secret_masked,booking_url,event_type_uri,timezone',
  'notes,created_at,updated_at',
].join(',');

export const schedulingProviderApi = {
  async list(): Promise<SchedulingProviderConfig[]> {
    const { data, error } = await supabase.from('scheduling_provider_configs').select(SCHEDULING_SELECT).order('display_order');
    if (error) throw error;
    return (data ?? []) as SchedulingProviderConfig[];
  },
  async get(id: string): Promise<SchedulingProviderConfig | null> {
    const { data } = await supabase.from('scheduling_provider_configs').select(SCHEDULING_SELECT).eq('id', id).maybeSingle();
    return data as SchedulingProviderConfig | null;
  },
  async create(p: SchedulingProviderSave): Promise<SchedulingProviderConfig> {
    const { oauth_access_token_raw, oauth_refresh_token_raw, api_key_raw, webhook_signing_secret_raw, ...rest } = p;
    const ins: Record<string, unknown> = { ...rest };
    if (oauth_access_token_raw?.trim()) { ins.oauth_access_token = oauth_access_token_raw.trim(); ins.oauth_access_token_masked = mask(oauth_access_token_raw.trim()); }
    if (oauth_refresh_token_raw?.trim()) { ins.oauth_refresh_token = oauth_refresh_token_raw.trim(); ins.oauth_refresh_token_masked = mask(oauth_refresh_token_raw.trim()); }
    if (api_key_raw?.trim()) { ins.api_key = api_key_raw.trim(); ins.api_key_masked = mask(api_key_raw.trim()); }
    if (webhook_signing_secret_raw?.trim()) { ins.webhook_signing_secret = webhook_signing_secret_raw.trim(); ins.webhook_signing_secret_masked = mask(webhook_signing_secret_raw.trim()); }
    const { data, error } = await supabase.from('scheduling_provider_configs').insert(ins).select(SCHEDULING_SELECT).single();
    if (error) throw error;
    return data as SchedulingProviderConfig;
  },
  async update(id: string, p: Partial<SchedulingProviderSave>): Promise<SchedulingProviderConfig> {
    const { oauth_access_token_raw, oauth_refresh_token_raw, api_key_raw, webhook_signing_secret_raw, ...rest } = p;
    const upd: Record<string, unknown> = { ...rest };
    if (oauth_access_token_raw?.trim()) { upd.oauth_access_token = oauth_access_token_raw.trim(); upd.oauth_access_token_masked = mask(oauth_access_token_raw.trim()); }
    if (oauth_refresh_token_raw?.trim()) { upd.oauth_refresh_token = oauth_refresh_token_raw.trim(); upd.oauth_refresh_token_masked = mask(oauth_refresh_token_raw.trim()); }
    if (api_key_raw?.trim()) { upd.api_key = api_key_raw.trim(); upd.api_key_masked = mask(api_key_raw.trim()); }
    if (webhook_signing_secret_raw?.trim()) { upd.webhook_signing_secret = webhook_signing_secret_raw.trim(); upd.webhook_signing_secret_masked = mask(webhook_signing_secret_raw.trim()); }
    const { data, error } = await supabase.from('scheduling_provider_configs').update(upd).eq('id', id).select(SCHEDULING_SELECT).single();
    if (error) throw error;
    return data as SchedulingProviderConfig;
  },
  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase.from('scheduling_provider_configs').update({ is_primary: false }).eq('environment_mode', envMode).neq('id', id);
    const { error } = await supabase.from('scheduling_provider_configs').update({ is_primary: true, is_active: true }).eq('id', id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('scheduling_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },
  async runTest(id: string, adminEmail: string): Promise<GenericTestLog> {
    const { data: row } = await supabase.from('scheduling_provider_configs').select('*').eq('id', id).maybeSingle();
    const checks: GenericTestLog['checks_run'] = [];
    if (!row) return saveTestLog('scheduling', id, adminEmail, [{ name: 'Record exists', passed: false }], 'FAIL');
    const code = row.provider_code as string;
    if (code === 'stub') {
      checks.push({ name: 'Stub provider', passed: true, detail: 'Uses internal Supabase consultations table' });
      checks.push({ name: 'Active', passed: row.is_active, detail: row.is_active ? 'Active' : 'Disabled' });
    } else if (code === 'calendly') {
      checks.push({ name: 'API key (PAT)', passed: Boolean(row.api_key), detail: row.api_key ? 'Stored (masked)' : 'Missing — create at Calendly → Integrations → API & Webhooks' });
      checks.push({ name: 'Booking URL', passed: Boolean(row.booking_url?.trim()), detail: row.booking_url || 'e.g. https://calendly.com/yourname/30min' });
      if (row.event_type_uri?.trim()) checks.push({ name: 'Event type URI', passed: true, detail: row.event_type_uri });
      if (row.webhook_signing_secret) checks.push({ name: 'Webhook signing secret', passed: true, detail: 'Stored (masked)' });
    } else if (code === 'google_calendar') {
      checks.push({ name: 'Calendar ID', passed: Boolean(row.calendar_id?.trim()), detail: row.calendar_id || 'e.g. primary or full calendar address' });
      checks.push({ name: 'OAuth access token', passed: Boolean(row.oauth_access_token), detail: row.oauth_access_token ? 'Stored (masked)' : 'Missing — complete OAuth flow' });
      checks.push({ name: 'OAuth refresh token', passed: Boolean(row.oauth_refresh_token), detail: row.oauth_refresh_token ? 'Stored (masked)' : 'Missing — needed to refresh expired tokens' });
      checks.push({ name: 'Timezone', passed: Boolean(row.timezone?.trim()), detail: row.timezone || 'e.g. Asia/Kolkata' });
    } else {
      checks.push({ name: 'Provider recognized', passed: false, detail: `Unknown: ${code}` });
    }
    const status: GenericTestLog['status'] = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    return saveTestLog('scheduling', id, adminEmail, checks, status);
  },
  getTestLogs: (id: string) => getTestLogs('scheduling', id),
};
