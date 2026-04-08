import { supabase } from '../../lib/supabase';

export type IntegrationActionType =
  | 'CREDENTIAL_UPDATED'
  | 'CREDENTIAL_ROTATE_CONFIRMED'
  | 'SETTINGS_UPDATED'
  | 'PROVIDER_ENABLED'
  | 'PROVIDER_DISABLED'
  | 'SET_PRIMARY'
  | 'SET_FALLBACK'
  | 'UNSET_FALLBACK'
  | 'RUN_TEST'
  | 'PROVIDER_CREATED'
  | 'PROVIDER_DELETED'
  | 'ENV_MODE_CHANGED'
  | 'CACHE_REFRESH';

export interface IntegrationAuditEntry {
  id: string;
  actor_email: string;
  actor_role: string;
  provider_id: string | null;
  provider_name: string | null;
  category: string | null;
  action_type: IntegrationActionType;
  field_group: string;
  change_summary: string;
  environment_mode: string;
  created_at: string;
}

export interface LogIntegrationActionParams {
  actorEmail: string;
  actorRole: string;
  providerId?: string;
  providerName?: string;
  category?: string;
  actionType: IntegrationActionType;
  fieldGroup?: string;
  changeSummary: string;
  environmentMode?: string;
}

async function logAction(params: LogIntegrationActionParams): Promise<void> {
  try {
    await supabase.from('integration_config_audit_logs').insert({
      actor_email:      params.actorEmail,
      actor_role:       params.actorRole,
      provider_id:      params.providerId ?? null,
      provider_name:    params.providerName ?? null,
      category:         params.category ?? null,
      action_type:      params.actionType,
      field_group:      params.fieldGroup ?? 'general',
      change_summary:   params.changeSummary,
      environment_mode: params.environmentMode ?? 'SANDBOX',
    });
  } catch {
    // Audit logging must never break the main flow
  }
}

async function getProviderLogs(providerId: string, limit = 50): Promise<IntegrationAuditEntry[]> {
  const { data } = await supabase
    .from('integration_config_audit_logs')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as IntegrationAuditEntry[];
}

async function getAllLogs(limit = 100): Promise<IntegrationAuditEntry[]> {
  const { data } = await supabase
    .from('integration_config_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as IntegrationAuditEntry[];
}

export const integrationAuditApi = { logAction, getProviderLogs, getAllLogs };
