import { useState, useEffect } from 'react';
import {
  X, Save, Play, RefreshCw, Star, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, CheckCircle, Key, Shield,
  Info, Settings, ClipboardList, ChevronDown,
} from 'lucide-react';
import {
  emailProviderApi,
  type EmailProviderConfig,
  type EmailProviderCreate,
  type CommTestLog,
} from '../../api/services/communicationProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import CommTestLogList from './CommTestLogList';

const EMAIL_PROVIDER_CODES = ['resend', 'sendgrid', 'ses', 'smtp', 'stub', 'custom'];
type DrawerTab = 'config' | 'sender-info' | 'test-logs';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">
        {label}
        {hint && <span className="ml-1.5 text-slate-700">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono, disabled, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  mono?: boolean; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700 disabled:opacity-50 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function SecretField({ label, hint, maskedValue, value, onChange, placeholder }: {
  label: string; hint?: string; maskedValue?: string | null;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      {maskedValue && (
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono text-xs text-slate-400">{maskedValue}</span>
        </div>
      )}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={maskedValue ? 'Enter new value to replace' : placeholder}
          className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm font-mono rounded-xl px-3 py-2 pr-10 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700"
        />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </Field>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`inline-flex items-center gap-2 text-sm transition-colors ${checked ? 'text-emerald-400' : 'text-slate-500'}`}>
      {checked ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
      {label}
    </button>
  );
}

interface Props {
  provider: EmailProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: EmailProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function EmailProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab] = useState<DrawerTab>('config');

  const [providerCode, setProviderCode] = useState(provider?.provider_code ?? 'resend');
  const [providerName, setProviderName] = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]           = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]         = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback]     = useState(provider?.is_fallback ?? false);
  const [notes, setNotes]               = useState(provider?.notes ?? '');
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);

  const [senderEmail, setSenderEmail]   = useState(provider?.sender_email ?? '');
  const [senderName, setSenderName]     = useState(provider?.sender_name ?? '');
  const [replyTo, setReplyTo]           = useState(provider?.reply_to_email ?? '');

  const [resendKey, setResendKey]               = useState('');
  const [sendgridKey, setSendgridKey]           = useState('');
  const [sesKeyId, setSesKeyId]                 = useState(provider?.ses_access_key_id ?? '');
  const [sesSecret, setSesSecret]               = useState('');
  const [sesRegion, setSesRegion]               = useState(provider?.ses_region ?? 'ap-south-1');
  const [smtpHost, setSmtpHost]                 = useState(provider?.smtp_host ?? '');
  const [smtpPort, setSmtpPort]                 = useState(String(provider?.smtp_port ?? '587'));
  const [smtpUser, setSmtpUser]                 = useState(provider?.smtp_username ?? '');
  const [smtpPass, setSmtpPass]                 = useState('');
  const [smtpTls, setSmtpTls]                   = useState(provider?.smtp_use_tls ?? true);

  const [testEmail, setTestEmail]         = useState('');
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [runningTest, setRunningTest]     = useState(false);
  const [testLogs, setTestLogs]           = useState<CommTestLog[]>([]);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (provider && tab === 'test-logs') loadLogs();
  }, [tab, provider]);

  async function loadLogs() {
    if (!provider) return;
    setLogsLoading(true);
    const logs = await emailProviderApi.getTestLogs(provider.id);
    setTestLogs(logs);
    setLogsLoading(false);
  }

  async function handleSave() {
    if (!providerName.trim()) { setSaveError('Provider name is required.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const payload: EmailProviderCreate = {
        provider_code: providerCode,
        provider_name: providerName.trim(),
        environment_mode: envMode,
        is_active: isActive,
        is_fallback: isFallback,
        notes: notes.trim() || undefined,
        display_order: displayOrder,
        sender_email: senderEmail.trim() || undefined,
        sender_name: senderName.trim() || undefined,
        reply_to_email: replyTo.trim() || undefined,
      };

      if (providerCode === 'resend' && resendKey.trim()) payload.resend_api_key_raw = resendKey.trim();
      if (providerCode === 'sendgrid' && sendgridKey.trim()) payload.sendgrid_api_key_raw = sendgridKey.trim();
      if (providerCode === 'ses') {
        if (sesKeyId.trim()) payload.ses_access_key_id = sesKeyId.trim();
        if (sesSecret.trim()) payload.ses_secret_access_key_raw = sesSecret.trim();
        if (sesRegion.trim()) payload.ses_region = sesRegion.trim();
      }
      if (providerCode === 'smtp') {
        if (smtpHost.trim()) payload.smtp_host = smtpHost.trim();
        const port = parseInt(smtpPort);
        if (!isNaN(port)) payload.smtp_port = port;
        if (smtpUser.trim()) payload.smtp_username = smtpUser.trim();
        if (smtpPass.trim()) payload.smtp_password_raw = smtpPass.trim();
        payload.smtp_use_tls = smtpTls;
      }

      let saved: EmailProviderConfig;
      if (isNew) {
        saved = await emailProviderApi.create(payload);
      } else {
        saved = await emailProviderApi.update(provider!.id, payload);
      }
      setSaveSuccess(true);
      const credentialUpdated = resendKey.trim() || sendgridKey.trim() || sesSecret.trim() || smtpPass.trim();
      setResendKey('');
      setSendgridKey('');
      setSesSecret('');
      setSmtpPass('');
      setTimeout(() => setSaveSuccess(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'email',
        actionType: isNew ? 'PROVIDER_CREATED' : (credentialUpdated ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: credentialUpdated ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created email provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated email provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    }
    setSaving(false);
  }

  async function handleSetPrimary() {
    if (!provider) return;
    await emailProviderApi.setPrimary(provider.id, provider.environment_mode);
    const updated = await emailProviderApi.get(provider.id);
    if (updated) onSaved(updated);
  }

  async function handleRunTest() {
    if (!provider) return;
    setRunningTest(true);
    try {
      const log = await emailProviderApi.runConfigTest(provider.id, adminEmail, testEmail.trim() || undefined);
      setTestLogs((prev) => [log, ...prev]);
      setTab('test-logs');
    } catch { /* ignore */ }
    setRunningTest(false);
  }

  async function handleDelete() {
    if (!provider) return;
    await emailProviderApi.delete(provider.id);
    onDeleted(provider.id);
    onClose();
  }

  const TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: 'config', label: 'Configuration', icon: Settings },
    ...(!isNew ? [
      { key: 'sender-info' as DrawerTab, label: 'Sender Guidance', icon: Info },
      { key: 'test-logs' as DrawerTab, label: 'Test Logs', icon: ClipboardList },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">
              {isNew ? 'Add Email Provider' : (provider?.provider_name || 'Edit Provider')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew ? 'Configure a new email gateway' : `${provider?.provider_code} · ${provider?.environment_mode}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
            />
            <button
              onClick={handleRunTest}
              disabled={runningTest}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {runningTest ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</> : <><Play className="w-3 h-3" /> Test Config</>}
            </button>
            <button
              onClick={handleSetPrimary}
              disabled={provider.is_primary}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${
                provider.is_primary ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <Star className={`w-3 h-3 ${provider.is_primary ? 'fill-amber-400' : ''}`} />
              {provider.is_primary ? 'Primary' : 'Set Primary'}
            </button>
            <div className="flex-1" />
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              provider.environment_mode === 'LIVE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
            }`}>
              {provider.environment_mode}
            </span>
          </div>
        )}

        <div className="flex border-b border-white/[0.05] shrink-0">
          {TABS.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                <TIcon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {tab === 'config' && (
            <div className="space-y-5">
              {saveError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{saveError}</div>}
              {saveSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved.
                </div>
              )}

              {/* Identity */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Provider Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Provider Type">
                    <div className="relative">
                      <select value={providerCode} onChange={(e) => setProviderCode(e.target.value)} className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40">
                        {EMAIL_PROVIDER_CODES.map((c) => <option key={c} value={c} className="bg-[#0D1120] capitalize">{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Environment">
                    <div className="relative">
                      <select value={envMode} onChange={(e) => setEnvMode(e.target.value)} className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40">
                        <option value="SANDBOX" className="bg-[#0D1120]">Sandbox</option>
                        <option value="LIVE" className="bg-[#0D1120]">Live</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                </div>
                <Field label="Display Name">
                  <TextInput value={providerName} onChange={setProviderName} placeholder="e.g. Resend – Production" />
                </Field>
              </div>

              {/* Sender identity */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sender Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sender Email" hint="(must be verified)">
                    <TextInput value={senderEmail} onChange={setSenderEmail} placeholder="reports@yourdomain.com" type="email" />
                  </Field>
                  <Field label="Sender Name">
                    <TextInput value={senderName} onChange={setSenderName} placeholder="YourApp" />
                  </Field>
                </div>
                <Field label="Reply-To Email" hint="(optional)">
                  <TextInput value={replyTo} onChange={setReplyTo} placeholder="team@yourdomain.com" type="email" />
                </Field>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-300/70">
                    The sender email must be verified with your email provider before sending. For Resend and SendGrid, verify your domain in their dashboard. For AWS SES, verify each identity in the SES console.
                  </p>
                </div>
              </div>

              {/* Resend */}
              {providerCode === 'resend' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Resend API Key</p>
                  </div>
                  <SecretField
                    label="API Key"
                    hint={provider?.resend_api_key_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.resend_api_key_masked}
                    value={resendKey}
                    onChange={setResendKey}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-slate-700">Get your API key from resend.com → API Keys. Key should start with <code className="text-slate-500">re_</code></p>
                </div>
              )}

              {/* SendGrid */}
              {providerCode === 'sendgrid' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">SendGrid API Key</p>
                  </div>
                  <SecretField
                    label="API Key"
                    hint={provider?.sendgrid_api_key_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.sendgrid_api_key_masked}
                    value={sendgridKey}
                    onChange={setSendgridKey}
                    placeholder="SG.xxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-slate-700">Key should start with <code className="text-slate-500">SG.</code>. Use "Restricted Access" keys with only Mail Send permission.</p>
                </div>
              )}

              {/* AWS SES */}
              {providerCode === 'ses' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">AWS SES Credentials</p>
                  </div>
                  <Field label="Access Key ID">
                    <TextInput value={sesKeyId} onChange={setSesKeyId} placeholder="AKIAXXXXXXXXXXXXXXXX" mono />
                  </Field>
                  <SecretField
                    label="Secret Access Key"
                    maskedValue={provider?.ses_secret_access_key_masked}
                    value={sesSecret}
                    onChange={setSesSecret}
                    placeholder="Your AWS secret access key"
                  />
                  <Field label="AWS Region">
                    <TextInput value={sesRegion} onChange={setSesRegion} placeholder="ap-south-1" mono />
                  </Field>
                </div>
              )}

              {/* SMTP */}
              {providerCode === 'smtp' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">SMTP Settings</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SMTP Host">
                      <TextInput value={smtpHost} onChange={setSmtpHost} placeholder="smtp.example.com" mono />
                    </Field>
                    <Field label="Port">
                      <TextInput value={smtpPort} onChange={setSmtpPort} placeholder="587" mono />
                    </Field>
                  </div>
                  <Field label="Username">
                    <TextInput value={smtpUser} onChange={setSmtpUser} placeholder="your@email.com" />
                  </Field>
                  <SecretField
                    label="Password"
                    maskedValue={provider?.smtp_password_masked}
                    value={smtpPass}
                    onChange={setSmtpPass}
                    placeholder="SMTP password or app password"
                  />
                  <Toggle checked={smtpTls} onChange={setSmtpTls} label="Use TLS/STARTTLS" />
                </div>
              )}

              {/* Stub */}
              {providerCode === 'stub' && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Stub Provider — No credentials required</p>
                      <p className="text-xs text-slate-600 mt-1">Logs email content to the backend console. No real emails are sent. Use only for development.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* State toggles */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Status</p>
                <Toggle checked={isActive} onChange={setIsActive} label="Provider active" />
                <Toggle checked={isFallback} onChange={setIsFallback} label="Use as fallback provider" />
              </div>

              {/* Notes */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Admin Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Monthly send limits, bounce thresholds, domain verification status…"
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {!isNew && (
                <div className="pt-1 border-t border-white/[0.05]">
                  {confirmDelete ? (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-red-400 flex-1">Delete this provider? Cannot be undone.</p>
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
                      <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">Delete</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} disabled={provider?.is_primary} className="inline-flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-3 h-3" /> Delete provider
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'sender-info' && provider && (
            <div className="space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  Emails will be rejected or land in spam if your sender domain is not verified with your provider and properly configured with DNS records (SPF, DKIM, DMARC).
                </p>
              </div>

              <div className="space-y-4">
                {provider.sender_email && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-600 mb-1">Active Sender</p>
                    <p className="text-sm font-medium text-slate-300">
                      {provider.sender_name ? `${provider.sender_name} <${provider.sender_email}>` : provider.sender_email}
                    </p>
                  </div>
                )}

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-2">
                  <p className="font-semibold text-slate-400 mb-2">
                    {provider.provider_code === 'resend' ? 'Resend' :
                     provider.provider_code === 'sendgrid' ? 'SendGrid' :
                     provider.provider_code === 'ses' ? 'AWS SES' : 'Email'} Setup Checklist
                  </p>
                  {provider.provider_code === 'resend' && <>
                    <p>1. Log in to resend.com → Domains → Add Domain</p>
                    <p>2. Add the DNS records Resend shows (MX, TXT for SPF/DKIM)</p>
                    <p>3. Wait for domain verification (usually minutes)</p>
                    <p>4. Go to API Keys → Create API Key → copy and paste above</p>
                    <p>5. Use the verified domain in your From address</p>
                  </>}
                  {provider.provider_code === 'sendgrid' && <>
                    <p>1. Log in to app.sendgrid.com → Settings → Sender Authentication</p>
                    <p>2. Authenticate your domain with CNAME records</p>
                    <p>3. Go to Settings → API Keys → Create API Key with Mail Send access</p>
                    <p>4. Copy API key (shown only once) and paste above</p>
                  </>}
                  {provider.provider_code === 'ses' && <>
                    <p>1. Log in to AWS console → Simple Email Service</p>
                    <p>2. Verified Identities → Create Identity → verify your domain</p>
                    <p>3. Add DNS records (DKIM, SPF) as shown in SES console</p>
                    <p>4. If in sandbox: request production access to send to unverified addresses</p>
                    <p>5. Create IAM user with ses:SendEmail permission, generate access keys</p>
                  </>}
                  {provider.provider_code === 'smtp' && <>
                    <p>1. Get SMTP credentials from your mail provider (Gmail App Password, Mailgun, etc.)</p>
                    <p>2. Use port 587 with STARTTLS or 465 with SSL</p>
                    <p>3. Set From address to a verified sender</p>
                    <p>4. Test with a real address before enabling in production</p>
                  </>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Environment', value: provider.environment_mode },
                    { label: 'Provider', value: provider.provider_code },
                    { label: 'Primary', value: provider.is_primary ? 'Yes' : 'No' },
                    { label: 'Active', value: provider.is_active ? 'Yes' : 'No' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
                      <p className="text-xs text-slate-600">{label}</p>
                      <p className="text-sm font-medium text-slate-300 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'test-logs' && (
            <CommTestLogList logs={testLogs} loading={logsLoading} />
          )}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <button onClick={handleSave} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2.5 transition-colors font-medium">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isNew ? 'Create Provider' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
