import { supabase } from '../../lib/supabase';

export interface PaymentProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;

  payu_merchant_key_masked: string | null;
  payu_salt_masked: string | null;
  payu_base_url: string | null;
  payu_success_url: string | null;
  payu_failure_url: string | null;

  razorpay_key_id: string | null;
  razorpay_key_secret_masked: string | null;
  razorpay_webhook_secret_masked: string | null;

  webhook_url_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentProviderCreate {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;
  notes?: string;
  webhook_url_path?: string;

  payu_merchant_key_raw?: string;
  payu_salt_raw?: string;
  payu_base_url?: string;
  payu_success_url?: string;
  payu_failure_url?: string;

  razorpay_key_id?: string;
  razorpay_key_secret_raw?: string;
  razorpay_webhook_secret_raw?: string;
}

export type PaymentProviderUpdate = Partial<PaymentProviderCreate>;

export interface PaymentTestLog {
  id: string;
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

export const paymentProviderApi = {
  async listProviders(): Promise<PaymentProviderConfig[]> {
    const { data, error } = await supabase
      .from('payment_provider_configs')
      .select(
        'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,' +
        'payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,' +
        'razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,' +
        'webhook_url_path,notes,created_at,updated_at'
      )
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as PaymentProviderConfig[];
  },

  async getProvider(id: string): Promise<PaymentProviderConfig | null> {
    const { data } = await supabase
      .from('payment_provider_configs')
      .select(
        'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,' +
        'payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,' +
        'razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,' +
        'webhook_url_path,notes,created_at,updated_at'
      )
      .eq('id', id)
      .maybeSingle();
    return data as PaymentProviderConfig | null;
  },

  async createProvider(payload: PaymentProviderCreate): Promise<PaymentProviderConfig> {
    const { payu_merchant_key_raw, payu_salt_raw, razorpay_key_secret_raw, razorpay_webhook_secret_raw, ...rest } = payload;

    const insert: Record<string, unknown> = { ...rest };

    if (payu_merchant_key_raw?.trim()) {
      insert.payu_merchant_key = payu_merchant_key_raw.trim();
      insert.payu_merchant_key_masked = mask(payu_merchant_key_raw.trim());
    }
    if (payu_salt_raw?.trim()) {
      insert.payu_salt = payu_salt_raw.trim();
      insert.payu_salt_masked = mask(payu_salt_raw.trim());
    }
    if (razorpay_key_secret_raw?.trim()) {
      insert.razorpay_key_secret = razorpay_key_secret_raw.trim();
      insert.razorpay_key_secret_masked = mask(razorpay_key_secret_raw.trim());
    }
    if (razorpay_webhook_secret_raw?.trim()) {
      insert.razorpay_webhook_secret = razorpay_webhook_secret_raw.trim();
      insert.razorpay_webhook_secret_masked = mask(razorpay_webhook_secret_raw.trim());
    }

    const { data, error } = await supabase
      .from('payment_provider_configs')
      .insert(insert)
      .select('id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,webhook_url_path,notes,created_at,updated_at')
      .single();
    if (error) throw error;
    return data as PaymentProviderConfig;
  },

  async updateProvider(id: string, payload: PaymentProviderUpdate): Promise<PaymentProviderConfig> {
    const { payu_merchant_key_raw, payu_salt_raw, razorpay_key_secret_raw, razorpay_webhook_secret_raw, ...rest } = payload;

    const update: Record<string, unknown> = { ...rest };

    if (payu_merchant_key_raw?.trim()) {
      update.payu_merchant_key = payu_merchant_key_raw.trim();
      update.payu_merchant_key_masked = mask(payu_merchant_key_raw.trim());
    }
    if (payu_salt_raw?.trim()) {
      update.payu_salt = payu_salt_raw.trim();
      update.payu_salt_masked = mask(payu_salt_raw.trim());
    }
    if (razorpay_key_secret_raw?.trim()) {
      update.razorpay_key_secret = razorpay_key_secret_raw.trim();
      update.razorpay_key_secret_masked = mask(razorpay_key_secret_raw.trim());
    }
    if (razorpay_webhook_secret_raw?.trim()) {
      update.razorpay_webhook_secret = razorpay_webhook_secret_raw.trim();
      update.razorpay_webhook_secret_masked = mask(razorpay_webhook_secret_raw.trim());
    }

    const { data, error } = await supabase
      .from('payment_provider_configs')
      .update(update)
      .eq('id', id)
      .select('id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,webhook_url_path,notes,created_at,updated_at')
      .single();
    if (error) throw error;
    return data as PaymentProviderConfig;
  },

  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase
      .from('payment_provider_configs')
      .update({ is_primary: false })
      .eq('environment_mode', envMode)
      .neq('id', id);

    const { error } = await supabase
      .from('payment_provider_configs')
      .update({ is_primary: true, is_active: true })
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<PaymentProviderConfig> {
    const { data, error } = await supabase
      .from('payment_provider_configs')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,webhook_url_path,notes,created_at,updated_at')
      .single();
    if (error) throw error;
    return data as PaymentProviderConfig;
  },

  async setFallback(id: string, isFallback: boolean): Promise<PaymentProviderConfig> {
    const { data, error } = await supabase
      .from('payment_provider_configs')
      .update({ is_fallback: isFallback })
      .eq('id', id)
      .select('id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order,payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url,razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,webhook_url_path,notes,created_at,updated_at')
      .single();
    if (error) throw error;
    return data as PaymentProviderConfig;
  },

  async deleteProvider(id: string): Promise<void> {
    const { error } = await supabase.from('payment_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },

  async runConfigTest(providerId: string, adminEmail: string): Promise<PaymentTestLog> {
    const { data: row } = await supabase
      .from('payment_provider_configs')
      .select(
        'id,provider_code,is_active,environment_mode,' +
        'razorpay_key_id,razorpay_key_secret_masked,razorpay_webhook_secret_masked,' +
        'payu_merchant_key_masked,payu_salt_masked,payu_base_url,payu_success_url,payu_failure_url'
      )
      .eq('id', providerId)
      .maybeSingle();

    const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
    let overallStatus: 'PASS' | 'FAIL' | 'SKIPPED' = 'PASS';

    if (!row) {
      overallStatus = 'FAIL';
    } else {
      const code = row.provider_code as string;

      if (code === 'mock') {
        checks.push({ name: 'Provider code', passed: true, detail: 'mock — built-in, no credentials required' });
        checks.push({ name: 'Active status', passed: row.is_active, detail: row.is_active ? 'Active' : 'Provider is disabled' });
      } else if (code === 'razorpay') {
        const hasKeyId = Boolean(row.razorpay_key_id?.trim());
        const hasSecret = Boolean(row.razorpay_key_secret_masked);
        const hasWebhookSecret = Boolean(row.razorpay_webhook_secret_masked);
        const keyIdFormatOk = hasKeyId && (row.razorpay_key_id as string).startsWith('rzp_');

        checks.push({ name: 'Key ID present', passed: hasKeyId, detail: hasKeyId ? `${row.razorpay_key_id}` : 'Missing' });
        checks.push({ name: 'Key ID format', passed: keyIdFormatOk, detail: keyIdFormatOk ? 'Starts with rzp_' : 'Should start with rzp_test_ or rzp_live_' });
        checks.push({ name: 'Key secret present', passed: hasSecret, detail: hasSecret ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'Webhook secret present', passed: hasWebhookSecret, detail: hasWebhookSecret ? 'Stored (masked)' : 'Not configured (optional but recommended)' });
        checks.push({ name: 'Environment mode', passed: true, detail: row.environment_mode });

        if (row.environment_mode === 'LIVE' && (row.razorpay_key_id as string | null)?.startsWith('rzp_test_')) {
          checks.push({ name: 'Env/Key mismatch', passed: false, detail: 'Mode is LIVE but key starts with rzp_test_ — possible misconfiguration' });
        }
        if (row.environment_mode === 'SANDBOX' && (row.razorpay_key_id as string | null)?.startsWith('rzp_live_')) {
          checks.push({ name: 'Env/Key mismatch', passed: false, detail: 'Mode is SANDBOX but key starts with rzp_live_ — possible misconfiguration' });
        }
      } else if (code === 'payu') {
        const hasMerchantKey = Boolean(row.payu_merchant_key_masked);
        const hasSalt = Boolean(row.payu_salt_masked);
        const hasBaseUrl = Boolean(row.payu_base_url?.trim());
        const hasSuccessUrl = Boolean(row.payu_success_url?.trim());
        const hasFailureUrl = Boolean(row.payu_failure_url?.trim());

        checks.push({ name: 'Merchant key present', passed: hasMerchantKey, detail: hasMerchantKey ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'Salt/secret present', passed: hasSalt, detail: hasSalt ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'Base URL configured', passed: hasBaseUrl, detail: hasBaseUrl ? row.payu_base_url : 'Missing — should be https://secure.payu.in or test URL' });
        checks.push({ name: 'Success callback URL', passed: hasSuccessUrl, detail: hasSuccessUrl ? row.payu_success_url : 'Missing — configure in PayU dashboard' });
        checks.push({ name: 'Failure callback URL', passed: hasFailureUrl, detail: hasFailureUrl ? row.payu_failure_url : 'Missing — configure in PayU dashboard' });

        const testBaseUrl = 'https://test.payu.in';
        const prodBaseUrl = 'https://secure.payu.in';
        if (row.environment_mode === 'SANDBOX' && row.payu_base_url === prodBaseUrl) {
          checks.push({ name: 'Env/URL mismatch', passed: false, detail: 'Mode is SANDBOX but base URL points to production PayU' });
        }
        if (row.environment_mode === 'LIVE' && row.payu_base_url === testBaseUrl) {
          checks.push({ name: 'Env/URL mismatch', passed: false, detail: 'Mode is LIVE but base URL points to PayU test endpoint' });
        }
      } else {
        checks.push({ name: 'Provider recognized', passed: false, detail: `Unknown provider code: ${code}` });
      }

      const anyFailed = checks.some((c) => !c.passed);
      overallStatus = anyFailed ? 'FAIL' : 'PASS';
    }

    const summary = overallStatus === 'PASS'
      ? `All ${checks.length} checks passed. Configuration looks valid.`
      : `${checks.filter((c) => !c.passed).length} of ${checks.length} checks failed. Review highlighted issues.`;

    const { data: log, error } = await supabase
      .from('payment_config_test_logs')
      .insert({
        provider_config_id: providerId,
        tested_by_admin_id: adminEmail,
        status: overallStatus,
        summary,
        checks_run: checks,
      })
      .select()
      .single();
    if (error) throw error;
    return log as PaymentTestLog;
  },

  async getTestLogs(providerId: string): Promise<PaymentTestLog[]> {
    const { data, error } = await supabase
      .from('payment_config_test_logs')
      .select('*')
      .eq('provider_config_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as PaymentTestLog[];
  },
};
