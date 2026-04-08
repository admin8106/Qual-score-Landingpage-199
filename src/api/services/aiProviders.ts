import { supabase } from '../../lib/supabase';

export interface AiProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  api_key_masked: string | null;
  model_name: string;
  base_url: string | null;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  retry_count: number;
  json_strict_mode: boolean;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  environment_mode: string;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiProviderCreate {
  provider_code: string;
  provider_name: string;
  api_key_raw?: string;
  model_name: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  timeout_seconds?: number;
  retry_count?: number;
  json_strict_mode?: boolean;
  environment_mode?: string;
  display_order?: number;
  notes?: string;
}

export interface AiProviderUpdate extends Partial<Omit<AiProviderCreate, 'api_key_raw'>> {
  api_key_raw?: string;
}

export interface AiReportSettings {
  id: string;
  max_retries: number;
  fallback_to_template: boolean;
  validation_strictness: 'STRICT' | 'LENIENT' | 'OFF';
  default_temperature: number | null;
  prompt_version: string;
  model_usage_notes: string | null;
  updated_at: string;
  updated_by_admin_id: string | null;
}

export interface AiPromptVersion {
  id: string;
  version_code: string;
  version_label: string;
  prompt_type: string;
  is_active: boolean;
  release_notes: string | null;
  created_at: string;
}

export interface AiTestLog {
  id: string;
  provider_config_id: string;
  tested_by_admin_id: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT';
  response_summary: string | null;
  latency_ms: number | null;
  created_at: string;
}

function maskApiKey(raw: string): string {
  if (!raw || raw.length < 8) return '••••••••';
  return raw.slice(0, 8) + '••••••••' + raw.slice(-4);
}

export const aiProviderApi = {
  async listProviders(): Promise<AiProviderConfig[]> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AiProviderConfig[];
  },

  async getProvider(id: string): Promise<AiProviderConfig | null> {
    const { data } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data as AiProviderConfig | null;
  },

  async createProvider(payload: AiProviderCreate): Promise<AiProviderConfig> {
    const { api_key_raw, ...rest } = payload;
    const insertPayload: Record<string, unknown> = { ...rest };

    if (api_key_raw?.trim()) {
      insertPayload.api_key_encrypted = api_key_raw.trim();
      insertPayload.api_key_masked = maskApiKey(api_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data as AiProviderConfig;
  },

  async updateProvider(id: string, payload: AiProviderUpdate): Promise<AiProviderConfig> {
    const { api_key_raw, ...rest } = payload;
    const updatePayload: Record<string, unknown> = { ...rest };

    if (api_key_raw?.trim()) {
      updatePayload.api_key_encrypted = api_key_raw.trim();
      updatePayload.api_key_masked = maskApiKey(api_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AiProviderConfig;
  },

  async setPrimary(id: string): Promise<void> {
    await supabase
      .from('ai_provider_configs')
      .update({ is_primary: false })
      .neq('id', id);
    const { error } = await supabase
      .from('ai_provider_configs')
      .update({ is_primary: true, is_active: true })
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<AiProviderConfig> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AiProviderConfig;
  },

  async setFallback(id: string, isFallback: boolean): Promise<AiProviderConfig> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .update({ is_fallback: isFallback })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AiProviderConfig;
  },

  async deleteProvider(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async runConnectionTest(providerId: string, adminEmail: string): Promise<AiTestLog> {
    const { data: provider } = await supabase
      .from('ai_provider_configs')
      .select('api_key_masked, model_name, base_url, is_active')
      .eq('id', providerId)
      .maybeSingle();

    const hasKey = Boolean(provider?.api_key_masked && provider.api_key_masked !== '••••••••');

    const summary = hasKey
      ? `Configuration check passed. Model: ${provider!.model_name}. Use the backend /test endpoint for a live API ping.`
      : 'No API key configured for this provider.';

    const status: 'SUCCESS' | 'FAILURE' = hasKey ? 'SUCCESS' : 'FAILURE';

    const { data: log, error } = await supabase
      .from('ai_connection_test_logs')
      .insert({
        provider_config_id: providerId,
        tested_by_admin_id: adminEmail,
        status,
        response_summary: summary,
        latency_ms: null,
      })
      .select()
      .single();
    if (error) throw error;

    return log as AiTestLog;
  },

  async getTestLogs(providerId: string): Promise<AiTestLog[]> {
    const { data, error } = await supabase
      .from('ai_connection_test_logs')
      .select('*')
      .eq('provider_config_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as AiTestLog[];
  },

  async getReportSettings(): Promise<AiReportSettings | null> {
    const { data } = await supabase
      .from('ai_report_generation_settings')
      .select('*')
      .maybeSingle();
    return data as AiReportSettings | null;
  },

  async upsertReportSettings(settings: Partial<AiReportSettings>, adminEmail: string): Promise<AiReportSettings> {
    const { data: existing } = await supabase
      .from('ai_report_generation_settings')
      .select('id')
      .maybeSingle();

    const payload = {
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by_admin_id: adminEmail,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('ai_report_generation_settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as AiReportSettings;
    } else {
      const { data, error } = await supabase
        .from('ai_report_generation_settings')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as AiReportSettings;
    }
  },

  async listPromptVersions(): Promise<AiPromptVersion[]> {
    const { data, error } = await supabase
      .from('ai_prompt_versions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AiPromptVersion[];
  },

  async createPromptVersion(payload: Omit<AiPromptVersion, 'id' | 'created_at'>): Promise<AiPromptVersion> {
    const { data, error } = await supabase
      .from('ai_prompt_versions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AiPromptVersion;
  },

  async togglePromptVersionActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_prompt_versions')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },
};
