import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_label: string;
  flag_description: string;
  is_enabled: boolean;
  is_critical: boolean;
  category: string;
  last_changed_by_email: string | null;
  last_changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FlagCategory =
  | 'ai'
  | 'payments'
  | 'whatsapp'
  | 'email'
  | 'crm'
  | 'analytics'
  | 'storage'
  | 'scheduling'
  | 'general';

export interface FlagsByCategory {
  category: FlagCategory;
  label: string;
  flags: FeatureFlag[];
}

// ─── Category metadata ────────────────────────────────────────────────────────

export const FLAG_CATEGORY_LABELS: Record<string, string> = {
  ai:         'AI / LLM',
  payments:   'Payments',
  whatsapp:   'WhatsApp',
  email:      'Email',
  crm:        'CRM',
  analytics:  'Analytics',
  storage:    'Storage',
  scheduling: 'Scheduling',
  general:    'General',
};

const CATEGORY_ORDER = ['ai', 'payments', 'whatsapp', 'email', 'crm', 'analytics', 'storage', 'scheduling', 'general'];

// ─── API ──────────────────────────────────────────────────────────────────────

async function list(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('integration_feature_flags')
    .select('*')
    .order('category')
    .order('flag_key');

  if (error) throw error;
  return data ?? [];
}

async function listByCategory(): Promise<FlagsByCategory[]> {
  const flags = await list();

  const grouped: Record<string, FeatureFlag[]> = {};
  for (const f of flags) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  return CATEGORY_ORDER
    .filter((cat) => grouped[cat] && grouped[cat].length > 0)
    .map((cat) => ({
      category: cat as FlagCategory,
      label: FLAG_CATEGORY_LABELS[cat] ?? cat,
      flags: grouped[cat],
    }));
}

async function getByKey(flagKey: string): Promise<FeatureFlag | null> {
  const { data } = await supabase
    .from('integration_feature_flags')
    .select('*')
    .eq('flag_key', flagKey)
    .maybeSingle();

  return data;
}

async function toggle(
  flagKey: string,
  enabled: boolean,
  changedByEmail: string
): Promise<FeatureFlag> {
  const { data, error } = await supabase
    .from('integration_feature_flags')
    .update({
      is_enabled: enabled,
      last_changed_by_email: changedByEmail,
      last_changed_at: new Date().toISOString(),
    })
    .eq('flag_key', flagKey)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function updateNotes(flagKey: string, notes: string): Promise<FeatureFlag> {
  const { data, error } = await supabase
    .from('integration_feature_flags')
    .update({ notes })
    .eq('flag_key', flagKey)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function isEnabled(flagKey: string): Promise<boolean> {
  const flag = await getByKey(flagKey);
  return flag?.is_enabled ?? false;
}

async function getEnabledMap(): Promise<Record<string, boolean>> {
  const flags = await list();
  const map: Record<string, boolean> = {};
  for (const f of flags) {
    map[f.flag_key] = f.is_enabled;
  }
  return map;
}

export const featureFlagsApi = {
  list,
  listByCategory,
  getByKey,
  toggle,
  updateNotes,
  isEnabled,
  getEnabledMap,
};

// ─── Well-known flag keys (type-safe constants) ───────────────────────────────

export const FLAG_KEYS = {
  AI_ENABLED:                'ai_enabled',
  AI_FALLBACK_TO_TEMPLATE:   'ai_fallback_to_template',
  AI_LINKEDIN_ANALYSIS:      'ai_linkedin_analysis',
  PAYMENT_LIVE_MODE:         'payment_live_mode',
  PAYMENT_WEBHOOK_VERIFY:    'payment_webhook_verify',
  WHATSAPP_SEND_ENABLED:     'whatsapp_send_enabled',
  WHATSAPP_REPORT_NOTIFY:    'whatsapp_report_notify',
  WHATSAPP_BOOKING_CONFIRM:  'whatsapp_booking_confirm',
  EMAIL_SEND_ENABLED:        'email_send_enabled',
  EMAIL_REPORT_NOTIFY:       'email_report_notify',
  EMAIL_PAYMENT_CONFIRM:     'email_payment_confirm',
  CRM_PUSH_ENABLED:          'crm_push_enabled',
  CRM_PUSH_ON_PAYMENT:       'crm_push_on_payment',
  CRM_PUSH_ON_REPORT:        'crm_push_on_report',
  CRM_PUSH_ON_BOOKING:       'crm_push_on_booking',
  ANALYTICS_PUSH_ENABLED:    'analytics_push_enabled',
  ANALYTICS_CONVERSION:      'analytics_conversion_events',
  STORAGE_ENABLED:           'storage_enabled',
  STORAGE_REPORT_PERSIST:    'storage_report_persist',
  SCHEDULING_ENABLED:        'scheduling_enabled',
  SCHEDULING_REMINDERS:      'scheduling_reminders',
} as const;
