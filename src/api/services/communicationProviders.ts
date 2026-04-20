import { supabase } from '../../lib/supabase';

// ─── Shared ───────────────────────────────────────────────────────────────────

export type CommChannel = 'whatsapp' | 'email';

export interface CommTestLog {
  id: string;
  channel: CommChannel;
  provider_config_id: string;
  tested_by_admin_id: string | null;
  test_recipient: string | null;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'PENDING';
  summary: string | null;
  checks_run: Array<{ name: string; passed: boolean; detail?: string }>;
  created_at: string;
}

function mask(raw: string): string {
  if (!raw || raw.length < 6) return '••••••••';
  return raw.slice(0, 4) + '••••••••' + raw.slice(-4);
}

// ─── WhatsApp provider ────────────────────────────────────────────────────────

export interface WhatsAppProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;

  meta_access_token_masked: string | null;
  meta_phone_number_id: string | null;
  meta_business_account_id: string | null;
  meta_webhook_verify_token_masked: string | null;
  meta_api_version: string | null;

  twilio_account_sid: string | null;
  twilio_auth_token_masked: string | null;
  twilio_from_number: string | null;

  msg91_auth_key_masked: string | null;
  msg91_sender_id: string | null;

  sender_phone_display: string | null;
  webhook_url_path: string | null;
  template_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppProviderCreate {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;

  meta_access_token_raw?: string;
  meta_phone_number_id?: string;
  meta_business_account_id?: string;
  meta_webhook_verify_token_raw?: string;
  meta_api_version?: string;

  twilio_account_sid?: string;
  twilio_auth_token_raw?: string;
  twilio_from_number?: string;

  msg91_auth_key_raw?: string;
  msg91_sender_id?: string;

  sender_phone_display?: string;
  webhook_url_path?: string;
  template_notes?: string;
  notes?: string;
}

const WA_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order',
  'meta_access_token_masked,meta_phone_number_id,meta_business_account_id',
  'meta_webhook_verify_token_masked,meta_api_version',
  'twilio_account_sid,twilio_auth_token_masked,twilio_from_number',
  'msg91_auth_key_masked,msg91_sender_id',
  'sender_phone_display,webhook_url_path,template_notes,notes,created_at,updated_at',
].join(',');

export const whatsappProviderApi = {
  async list(): Promise<WhatsAppProviderConfig[]> {
    const { data, error } = await supabase
      .from('whatsapp_provider_configs')
      .select(WA_SELECT)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WhatsAppProviderConfig[];
  },

  async get(id: string): Promise<WhatsAppProviderConfig | null> {
    const { data } = await supabase
      .from('whatsapp_provider_configs')
      .select(WA_SELECT)
      .eq('id', id)
      .maybeSingle();
    return data as WhatsAppProviderConfig | null;
  },

  async create(payload: WhatsAppProviderCreate): Promise<WhatsAppProviderConfig> {
    const { meta_access_token_raw, meta_webhook_verify_token_raw,
            twilio_auth_token_raw, msg91_auth_key_raw, ...rest } = payload;

    const insert: Record<string, unknown> = { ...rest };

    if (meta_access_token_raw?.trim()) {
      insert.meta_access_token = meta_access_token_raw.trim();
      insert.meta_access_token_masked = mask(meta_access_token_raw.trim());
    }
    if (meta_webhook_verify_token_raw?.trim()) {
      insert.meta_webhook_verify_token = meta_webhook_verify_token_raw.trim();
      insert.meta_webhook_verify_token_masked = mask(meta_webhook_verify_token_raw.trim());
    }
    if (twilio_auth_token_raw?.trim()) {
      insert.twilio_auth_token = twilio_auth_token_raw.trim();
      insert.twilio_auth_token_masked = mask(twilio_auth_token_raw.trim());
    }
    if (msg91_auth_key_raw?.trim()) {
      insert.msg91_auth_key = msg91_auth_key_raw.trim();
      insert.msg91_auth_key_masked = mask(msg91_auth_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('whatsapp_provider_configs')
      .insert(insert)
      .select(WA_SELECT)
      .single();
    if (error) throw error;
    return data as WhatsAppProviderConfig;
  },

  async update(id: string, payload: Partial<WhatsAppProviderCreate>): Promise<WhatsAppProviderConfig> {
    const { meta_access_token_raw, meta_webhook_verify_token_raw,
            twilio_auth_token_raw, msg91_auth_key_raw, ...rest } = payload;

    const update: Record<string, unknown> = { ...rest };

    if (meta_access_token_raw?.trim()) {
      update.meta_access_token = meta_access_token_raw.trim();
      update.meta_access_token_masked = mask(meta_access_token_raw.trim());
    }
    if (meta_webhook_verify_token_raw?.trim()) {
      update.meta_webhook_verify_token = meta_webhook_verify_token_raw.trim();
      update.meta_webhook_verify_token_masked = mask(meta_webhook_verify_token_raw.trim());
    }
    if (twilio_auth_token_raw?.trim()) {
      update.twilio_auth_token = twilio_auth_token_raw.trim();
      update.twilio_auth_token_masked = mask(twilio_auth_token_raw.trim());
    }
    if (msg91_auth_key_raw?.trim()) {
      update.msg91_auth_key = msg91_auth_key_raw.trim();
      update.msg91_auth_key_masked = mask(msg91_auth_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('whatsapp_provider_configs')
      .update(update)
      .eq('id', id)
      .select(WA_SELECT)
      .single();
    if (error) throw error;
    return data as WhatsAppProviderConfig;
  },

  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase.from('whatsapp_provider_configs')
      .update({ is_primary: false }).eq('environment_mode', envMode).neq('id', id);
    const { error } = await supabase.from('whatsapp_provider_configs')
      .update({ is_primary: true, is_active: true }).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('whatsapp_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },

  async runConfigTest(id: string, adminEmail: string, testPhone?: string): Promise<CommTestLog> {
    const { data: row } = await supabase
      .from('whatsapp_provider_configs')
      .select(
        'id,provider_code,is_active,environment_mode,' +
        'meta_access_token_masked,meta_phone_number_id,meta_business_account_id,' +
        'meta_webhook_verify_token_masked,meta_api_version,sender_phone_display,' +
        'twilio_account_sid,twilio_auth_token_masked,twilio_from_number,' +
        'msg91_auth_key_masked,msg91_sender_id'
      )
      .eq('id', id)
      .maybeSingle();

    const checks: CommTestLog['checks_run'] = [];
    let status: CommTestLog['status'] = 'PASS';

    if (!row) {
      status = 'FAIL';
    } else {
      const code = row.provider_code as string;

      if (code === 'stub') {
        checks.push({ name: 'Provider type', passed: true, detail: 'Stub — built-in, no credentials required' });
        checks.push({ name: 'Active', passed: row.is_active, detail: row.is_active ? 'Active' : 'Provider is disabled' });
      } else if (code === 'meta') {
        const hasToken = Boolean(row.meta_access_token_masked);
        const hasPhoneId = Boolean(row.meta_phone_number_id?.trim());
        const hasBusinessId = Boolean(row.meta_business_account_id?.trim());
        const hasWebhookToken = Boolean(row.meta_webhook_verify_token_masked);
        const versionOk = Boolean(row.meta_api_version?.startsWith('v'));

        checks.push({ name: 'Access token present', passed: hasToken, detail: hasToken ? 'Stored (masked)' : 'Missing — required for sending' });
        checks.push({ name: 'Phone Number ID present', passed: hasPhoneId, detail: hasPhoneId ? row.meta_phone_number_id : 'Missing — find in Meta API Setup' });
        checks.push({ name: 'Business Account ID', passed: hasBusinessId, detail: hasBusinessId ? row.meta_business_account_id : 'Optional but recommended for webhook verification' });
        checks.push({ name: 'Webhook verify token', passed: hasWebhookToken, detail: hasWebhookToken ? 'Stored (masked)' : 'Optional — required if you configure webhooks' });
        checks.push({ name: 'API version format', passed: versionOk, detail: versionOk ? row.meta_api_version : 'Should be like v19.0 or v20.0' });
        checks.push({ name: 'Sender phone display', passed: Boolean(row.sender_phone_display?.trim()), detail: row.sender_phone_display || 'Not set — add for display clarity' });

        if (testPhone?.trim()) {
          checks.push({ name: 'Test recipient configured', passed: true, detail: `Will attempt send to: ${testPhone}` });
        }
      } else if (code === 'twilio') {
        const hasSid = Boolean(row.twilio_account_sid?.trim());
        const hasToken = Boolean(row.twilio_auth_token_masked);
        const hasFrom = Boolean(row.twilio_from_number?.trim());

        checks.push({ name: 'Account SID', passed: hasSid, detail: hasSid ? row.twilio_account_sid : 'Missing' });
        checks.push({ name: 'Auth token', passed: hasToken, detail: hasToken ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'From number', passed: hasFrom, detail: hasFrom ? row.twilio_from_number : 'Missing — must be a Twilio WhatsApp-enabled number' });
      } else if (code === 'msg91') {
        const hasKey = Boolean(row.msg91_auth_key_masked);
        const hasSender = Boolean(row.msg91_sender_id?.trim());

        checks.push({ name: 'Auth key', passed: hasKey, detail: hasKey ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'Sender ID', passed: hasSender, detail: hasSender ? row.msg91_sender_id : 'Missing' });
      } else {
        checks.push({ name: 'Provider code recognized', passed: false, detail: `Unknown provider: ${code}` });
      }

      status = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    }

    const summary = status === 'PASS'
      ? `All ${checks.length} checks passed.`
      : `${checks.filter((c) => !c.passed).length} of ${checks.length} checks failed.`;

    const { data: log, error } = await supabase.from('communication_config_test_logs')
      .insert({ channel: 'whatsapp', provider_config_id: id, tested_by_admin_id: adminEmail,
                test_recipient: testPhone || null, status, summary, checks_run: checks })
      .select().single();
    if (error) throw error;
    return log as CommTestLog;
  },

  async getTestLogs(id: string): Promise<CommTestLog[]> {
    const { data, error } = await supabase.from('communication_config_test_logs')
      .select('*').eq('provider_config_id', id).eq('channel', 'whatsapp')
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data ?? []) as CommTestLog[];
  },
};

// ─── Email provider ───────────────────────────────────────────────────────────

export interface EmailProviderConfig {
  id: string;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  is_active: boolean;
  is_primary: boolean;
  is_fallback: boolean;
  display_order: number;

  sender_email: string | null;
  sender_name: string | null;
  reply_to_email: string | null;

  sendgrid_api_key_masked: string | null;

  ses_access_key_id: string | null;
  ses_secret_access_key_masked: string | null;
  ses_region: string | null;

  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password_masked: string | null;
  smtp_use_tls: boolean;

  resend_api_key_masked: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailProviderCreate {
  provider_code: string;
  provider_name: string;
  environment_mode?: string;
  is_active?: boolean;
  is_primary?: boolean;
  is_fallback?: boolean;
  display_order?: number;

  sender_email?: string;
  sender_name?: string;
  reply_to_email?: string;

  sendgrid_api_key_raw?: string;

  ses_access_key_id?: string;
  ses_secret_access_key_raw?: string;
  ses_region?: string;

  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password_raw?: string;
  smtp_use_tls?: boolean;

  resend_api_key_raw?: string;

  notes?: string;
}

const EMAIL_SELECT = [
  'id,provider_code,provider_name,environment_mode,is_active,is_primary,is_fallback,display_order',
  'sender_email,sender_name,reply_to_email',
  'sendgrid_api_key_masked',
  'ses_access_key_id,ses_secret_access_key_masked,ses_region',
  'smtp_host,smtp_port,smtp_username,smtp_password_masked,smtp_use_tls',
  'resend_api_key_masked',
  'notes,created_at,updated_at',
].join(',');

export const emailProviderApi = {
  async list(): Promise<EmailProviderConfig[]> {
    const { data, error } = await supabase
      .from('email_provider_configs')
      .select(EMAIL_SELECT)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as EmailProviderConfig[];
  },

  async get(id: string): Promise<EmailProviderConfig | null> {
    const { data } = await supabase
      .from('email_provider_configs')
      .select(EMAIL_SELECT)
      .eq('id', id)
      .maybeSingle();
    return data as EmailProviderConfig | null;
  },

  async create(payload: EmailProviderCreate): Promise<EmailProviderConfig> {
    const { sendgrid_api_key_raw, ses_secret_access_key_raw,
            smtp_password_raw, resend_api_key_raw, ...rest } = payload;

    const insert: Record<string, unknown> = { ...rest };

    if (sendgrid_api_key_raw?.trim()) {
      insert.sendgrid_api_key = sendgrid_api_key_raw.trim();
      insert.sendgrid_api_key_masked = mask(sendgrid_api_key_raw.trim());
    }
    if (ses_secret_access_key_raw?.trim()) {
      insert.ses_secret_access_key = ses_secret_access_key_raw.trim();
      insert.ses_secret_access_key_masked = mask(ses_secret_access_key_raw.trim());
    }
    if (smtp_password_raw?.trim()) {
      insert.smtp_password = smtp_password_raw.trim();
      insert.smtp_password_masked = mask(smtp_password_raw.trim());
    }
    if (resend_api_key_raw?.trim()) {
      insert.resend_api_key = resend_api_key_raw.trim();
      insert.resend_api_key_masked = mask(resend_api_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('email_provider_configs')
      .insert(insert)
      .select(EMAIL_SELECT)
      .single();
    if (error) throw error;
    return data as EmailProviderConfig;
  },

  async update(id: string, payload: Partial<EmailProviderCreate>): Promise<EmailProviderConfig> {
    const { sendgrid_api_key_raw, ses_secret_access_key_raw,
            smtp_password_raw, resend_api_key_raw, ...rest } = payload;

    const update: Record<string, unknown> = { ...rest };

    if (sendgrid_api_key_raw?.trim()) {
      update.sendgrid_api_key = sendgrid_api_key_raw.trim();
      update.sendgrid_api_key_masked = mask(sendgrid_api_key_raw.trim());
    }
    if (ses_secret_access_key_raw?.trim()) {
      update.ses_secret_access_key = ses_secret_access_key_raw.trim();
      update.ses_secret_access_key_masked = mask(ses_secret_access_key_raw.trim());
    }
    if (smtp_password_raw?.trim()) {
      update.smtp_password = smtp_password_raw.trim();
      update.smtp_password_masked = mask(smtp_password_raw.trim());
    }
    if (resend_api_key_raw?.trim()) {
      update.resend_api_key = resend_api_key_raw.trim();
      update.resend_api_key_masked = mask(resend_api_key_raw.trim());
    }

    const { data, error } = await supabase
      .from('email_provider_configs')
      .update(update)
      .eq('id', id)
      .select(EMAIL_SELECT)
      .single();
    if (error) throw error;
    return data as EmailProviderConfig;
  },

  async setPrimary(id: string, envMode: string): Promise<void> {
    await supabase.from('email_provider_configs')
      .update({ is_primary: false }).eq('environment_mode', envMode).neq('id', id);
    const { error } = await supabase.from('email_provider_configs')
      .update({ is_primary: true, is_active: true }).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('email_provider_configs').delete().eq('id', id);
    if (error) throw error;
  },

  async runConfigTest(id: string, adminEmail: string, testEmail?: string): Promise<CommTestLog> {
    const { data: row } = await supabase
      .from('email_provider_configs')
      .select(
        'id,provider_code,is_active,environment_mode,' +
        'sender_email,sender_name,reply_to_email,' +
        'resend_api_key_masked,' +
        'sendgrid_api_key_masked,' +
        'ses_access_key_id,ses_secret_access_key_masked,ses_region,' +
        'smtp_host,smtp_port,smtp_username,smtp_password_masked,smtp_use_tls'
      )
      .eq('id', id)
      .maybeSingle();

    const checks: CommTestLog['checks_run'] = [];
    let status: CommTestLog['status'] = 'PASS';

    if (!row) {
      status = 'FAIL';
    } else {
      const code = row.provider_code as string;

      const hasSenderEmail = Boolean(row.sender_email?.trim());
      const hasSenderName = Boolean(row.sender_name?.trim());
      const emailFmt = hasSenderEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.sender_email);

      checks.push({ name: 'Sender email set', passed: hasSenderEmail, detail: hasSenderEmail ? row.sender_email : 'Missing — required for all providers' });
      checks.push({ name: 'Sender email format', passed: emailFmt, detail: emailFmt ? 'Valid format' : 'Invalid email format' });
      checks.push({ name: 'Sender name set', passed: hasSenderName, detail: hasSenderName ? row.sender_name : 'Optional but recommended' });

      if (code === 'stub') {
        checks.push({ name: 'Provider type', passed: true, detail: 'Stub — built-in, no credentials required' });
      } else if (code === 'resend') {
        const hasKey = Boolean(row.resend_api_key_masked);
        checks.push({ name: 'Resend API key present', passed: hasKey, detail: hasKey ? 'Stored (masked)' : 'Missing' });
      } else if (code === 'sendgrid') {
        const hasKey = Boolean(row.sendgrid_api_key_masked);
        checks.push({ name: 'SendGrid API key present', passed: hasKey, detail: hasKey ? 'Stored (masked)' : 'Missing' });
      } else if (code === 'ses') {
        const hasKeyId = Boolean(row.ses_access_key_id?.trim());
        const hasSecret = Boolean(row.ses_secret_access_key_masked);
        const hasRegion = Boolean(row.ses_region?.trim());
        checks.push({ name: 'Access Key ID', passed: hasKeyId, detail: hasKeyId ? row.ses_access_key_id : 'Missing' });
        checks.push({ name: 'Secret Access Key', passed: hasSecret, detail: hasSecret ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'AWS Region', passed: hasRegion, detail: hasRegion ? row.ses_region : 'Missing — e.g. ap-south-1' });
      } else if (code === 'smtp') {
        const hasHost = Boolean(row.smtp_host?.trim());
        const hasPort = Boolean(row.smtp_port);
        const hasUser = Boolean(row.smtp_username?.trim());
        const hasPass = Boolean(row.smtp_password_masked);
        checks.push({ name: 'SMTP host', passed: hasHost, detail: hasHost ? row.smtp_host : 'Missing' });
        checks.push({ name: 'SMTP port', passed: hasPort, detail: hasPort ? String(row.smtp_port) : 'Missing — default 587 for TLS' });
        checks.push({ name: 'Username', passed: hasUser, detail: hasUser ? row.smtp_username : 'Missing' });
        checks.push({ name: 'Password', passed: hasPass, detail: hasPass ? 'Stored (masked)' : 'Missing' });
        checks.push({ name: 'TLS enabled', passed: row.smtp_use_tls, detail: row.smtp_use_tls ? 'TLS on' : 'TLS off — ensure your SMTP server supports plaintext' });
      } else {
        checks.push({ name: 'Provider code recognized', passed: false, detail: `Unknown provider: ${code}` });
      }

      if (testEmail?.trim()) {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim());
        checks.push({ name: 'Test email address', passed: valid, detail: valid ? `Will log test to: ${testEmail}` : 'Invalid test email format' });
      }

      status = checks.some((c) => !c.passed) ? 'FAIL' : 'PASS';
    }

    const summary = status === 'PASS'
      ? `All ${checks.length} checks passed.`
      : `${checks.filter((c) => !c.passed).length} of ${checks.length} checks failed.`;

    const { data: log, error } = await supabase.from('communication_config_test_logs')
      .insert({ channel: 'email', provider_config_id: id, tested_by_admin_id: adminEmail,
                test_recipient: testEmail || null, status, summary, checks_run: checks })
      .select().single();
    if (error) throw error;
    return log as CommTestLog;
  },

  async getTestLogs(id: string): Promise<CommTestLog[]> {
    const { data, error } = await supabase.from('communication_config_test_logs')
      .select('*').eq('provider_config_id', id).eq('channel', 'email')
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data ?? []) as CommTestLog[];
  },
};
