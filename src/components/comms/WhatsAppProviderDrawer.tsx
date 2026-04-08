import { useState, useEffect } from 'react';
import {
  X, Save, Play, RefreshCw, Star, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, CheckCircle, Key, Shield,
  Copy, ExternalLink, Info, Settings, ClipboardList, ChevronDown,
} from 'lucide-react';
import {
  whatsappProviderApi,
  type WhatsAppProviderConfig,
  type WhatsAppProviderCreate,
  type CommTestLog,
} from '../../api/services/communicationProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import CommTestLogList from './CommTestLogList';

const WA_PROVIDER_CODES = ['meta', 'twilio', 'msg91', 'stub', 'custom'];
type DrawerTab = 'config' | 'webhook-info' | 'test-logs';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600">{label}</p>
      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
        <code className="text-xs text-slate-400 font-mono flex-1 break-all">{value}</code>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

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

function TextInput({ value, onChange, placeholder, mono, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; disabled?: boolean;
}) {
  return (
    <input
      type="text"
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
  provider: WhatsAppProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  appBaseUrl: string;
  onClose: () => void;
  onSaved: (p: WhatsAppProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function WhatsAppProviderDrawer({ provider, isNew, adminEmail, appBaseUrl, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab] = useState<DrawerTab>('config');

  const [providerCode, setProviderCode] = useState(provider?.provider_code ?? 'meta');
  const [providerName, setProviderName] = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]           = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]         = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback]     = useState(provider?.is_fallback ?? false);
  const [notes, setNotes]               = useState(provider?.notes ?? '');
  const [templateNotes, setTemplateNotes] = useState(provider?.template_notes ?? '');
  const [senderPhone, setSenderPhone]   = useState(provider?.sender_phone_display ?? '');
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);

  const [metaToken, setMetaToken]           = useState('');
  const [metaPhoneId, setMetaPhoneId]       = useState(provider?.meta_phone_number_id ?? '');
  const [metaBizId, setMetaBizId]           = useState(provider?.meta_business_account_id ?? '');
  const [metaWebhookToken, setMetaWebhookToken] = useState('');
  const [metaApiVersion, setMetaApiVersion] = useState(provider?.meta_api_version ?? 'v19.0');

  const [twilioSid, setTwilioSid]         = useState(provider?.twilio_account_sid ?? '');
  const [twilioToken, setTwilioToken]     = useState('');
  const [twilioFrom, setTwilioFrom]       = useState(provider?.twilio_from_number ?? '');

  const [msg91Key, setMsg91Key]           = useState('');
  const [msg91Sender, setMsg91Sender]     = useState(provider?.msg91_sender_id ?? '');

  const [testPhone, setTestPhone]         = useState('');
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
    const logs = await whatsappProviderApi.getTestLogs(provider.id);
    setTestLogs(logs);
    setLogsLoading(false);
  }

  const webhookUrl = `${appBaseUrl}/api/v1/whatsapp/webhook`;

  async function handleSave() {
    if (!providerName.trim()) { setSaveError('Provider name is required.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const payload: WhatsAppProviderCreate = {
        provider_code: providerCode,
        provider_name: providerName.trim(),
        environment_mode: envMode,
        is_active: isActive,
        is_fallback: isFallback,
        notes: notes.trim() || undefined,
        template_notes: templateNotes.trim() || undefined,
        sender_phone_display: senderPhone.trim() || undefined,
        display_order: displayOrder,
        webhook_url_path: '/api/v1/whatsapp/webhook',
      };

      if (providerCode === 'meta') {
        if (metaToken.trim()) payload.meta_access_token_raw = metaToken.trim();
        if (metaPhoneId.trim()) payload.meta_phone_number_id = metaPhoneId.trim();
        if (metaBizId.trim()) payload.meta_business_account_id = metaBizId.trim();
        if (metaWebhookToken.trim()) payload.meta_webhook_verify_token_raw = metaWebhookToken.trim();
        if (metaApiVersion.trim()) payload.meta_api_version = metaApiVersion.trim();
      } else if (providerCode === 'twilio') {
        if (twilioSid.trim()) payload.twilio_account_sid = twilioSid.trim();
        if (twilioToken.trim()) payload.twilio_auth_token_raw = twilioToken.trim();
        if (twilioFrom.trim()) payload.twilio_from_number = twilioFrom.trim();
      } else if (providerCode === 'msg91') {
        if (msg91Key.trim()) payload.msg91_auth_key_raw = msg91Key.trim();
        if (msg91Sender.trim()) payload.msg91_sender_id = msg91Sender.trim();
      }

      let saved: WhatsAppProviderConfig;
      if (isNew) {
        saved = await whatsappProviderApi.create(payload);
      } else {
        saved = await whatsappProviderApi.update(provider!.id, payload);
      }
      setSaveSuccess(true);
      const credentialUpdated = metaToken.trim() || metaWebhookToken.trim() || twilioToken.trim() || msg91Key.trim();
      setMetaToken('');
      setMetaWebhookToken('');
      setTwilioToken('');
      setMsg91Key('');
      setTimeout(() => setSaveSuccess(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'whatsapp',
        actionType: isNew ? 'PROVIDER_CREATED' : (credentialUpdated ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: credentialUpdated ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created WhatsApp provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated WhatsApp provider "${saved.provider_name}" settings.`,
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
    await whatsappProviderApi.setPrimary(provider.id, provider.environment_mode);
    const updated = await whatsappProviderApi.get(provider.id);
    if (updated) onSaved(updated);
  }

  async function handleRunTest() {
    if (!provider) return;
    setRunningTest(true);
    try {
      const log = await whatsappProviderApi.runConfigTest(provider.id, adminEmail, testPhone.trim() || undefined);
      setTestLogs((prev) => [log, ...prev]);
      setTab('test-logs');
    } catch { /* ignore */ }
    setRunningTest(false);
  }

  async function handleDelete() {
    if (!provider) return;
    await whatsappProviderApi.delete(provider.id);
    onDeleted(provider.id);
    onClose();
  }

  const TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: 'config', label: 'Configuration', icon: Settings },
    ...(!isNew ? [
      { key: 'webhook-info' as DrawerTab, label: 'Webhook & Setup', icon: ExternalLink },
      { key: 'test-logs' as DrawerTab, label: 'Test Logs', icon: ClipboardList },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">
              {isNew ? 'Add WhatsApp Provider' : (provider?.provider_name || 'Edit Provider')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew ? 'Configure a new WhatsApp gateway' : `${provider?.provider_code} · ${provider?.environment_mode}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            <div className="relative">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs font-mono rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
              />
            </div>
            <button
              onClick={handleRunTest}
              disabled={runningTest}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-green-700 hover:bg-green-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {runningTest ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</> : <><Play className="w-3 h-3" /> Test Config</>}
            </button>
            <button
              onClick={handleSetPrimary}
              disabled={provider.is_primary}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${
                provider.is_primary
                  ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                  : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <Star className={`w-3 h-3 ${provider.is_primary ? 'fill-amber-400' : ''}`} />
              {provider.is_primary ? 'Primary' : 'Set Primary'}
            </button>
            <div className="flex-1" />
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              provider.environment_mode === 'LIVE'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
            }`}>
              {provider.environment_mode}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/[0.05] shrink-0">
          {TABS.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-green-500 text-green-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                <TIcon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
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
                        {WA_PROVIDER_CODES.map((c) => <option key={c} value={c} className="bg-[#0D1120] capitalize">{c}</option>)}
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
                  <TextInput value={providerName} onChange={setProviderName} placeholder="e.g. Meta Cloud API – Production" />
                </Field>
                <Field label="Sender Phone Number" hint="(display only)">
                  <TextInput value={senderPhone} onChange={setSenderPhone} placeholder="+91 9876543210" mono />
                </Field>
              </div>

              {/* Meta Cloud API */}
              {providerCode === 'meta' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-green-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Meta Cloud API Credentials</p>
                  </div>
                  <SecretField
                    label="Access Token"
                    hint={provider?.meta_access_token_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.meta_access_token_masked}
                    value={metaToken}
                    onChange={setMetaToken}
                    placeholder="EAAxxxxxxxxxxxxxxx"
                  />
                  <Field label="Phone Number ID" hint="(from Meta API Setup)">
                    <TextInput value={metaPhoneId} onChange={setMetaPhoneId} placeholder="1234567890123456" mono />
                  </Field>
                  <Field label="Business Account ID" hint="(optional)">
                    <TextInput value={metaBizId} onChange={setMetaBizId} placeholder="9876543210987654" mono />
                  </Field>
                  <SecretField
                    label="Webhook Verify Token"
                    hint="(choose any secret string, set same in Meta dashboard)"
                    maskedValue={provider?.meta_webhook_verify_token_masked}
                    value={metaWebhookToken}
                    onChange={setMetaWebhookToken}
                    placeholder="my-secret-verify-token"
                  />
                  <Field label="API Version">
                    <TextInput value={metaApiVersion} onChange={setMetaApiVersion} placeholder="v19.0" mono />
                  </Field>
                </div>
              )}

              {/* Twilio */}
              {providerCode === 'twilio' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Twilio Credentials</p>
                  </div>
                  <Field label="Account SID">
                    <TextInput value={twilioSid} onChange={setTwilioSid} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" mono />
                  </Field>
                  <SecretField
                    label="Auth Token"
                    maskedValue={provider?.twilio_auth_token_masked}
                    value={twilioToken}
                    onChange={setTwilioToken}
                    placeholder="Your Twilio auth token"
                  />
                  <Field label="From Number" hint="(must be WhatsApp-enabled)">
                    <TextInput value={twilioFrom} onChange={setTwilioFrom} placeholder="whatsapp:+14155238886" mono />
                  </Field>
                </div>
              )}

              {/* MSG91 */}
              {providerCode === 'msg91' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">MSG91 Credentials</p>
                  </div>
                  <SecretField
                    label="Auth Key"
                    maskedValue={provider?.msg91_auth_key_masked}
                    value={msg91Key}
                    onChange={setMsg91Key}
                    placeholder="Your MSG91 auth key"
                  />
                  <Field label="Sender ID">
                    <TextInput value={msg91Sender} onChange={setMsg91Sender} placeholder="QUALSC" mono />
                  </Field>
                </div>
              )}

              {/* Stub */}
              {providerCode === 'stub' && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Stub Provider — No credentials required</p>
                      <p className="text-xs text-slate-600 mt-1">Logs messages to the backend console. No real WhatsApp messages are sent. Use only for development.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Template notes */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Template Approval</p>
                </div>
                <p className="text-xs text-amber-300/70">
                  WhatsApp Business API requires pre-approved message templates for outbound notifications.
                  Templates must be submitted to Meta and approved before use. Free-form messages are only
                  allowed within a 24-hour customer service window.
                </p>
                <Field label="Template Notes / Approved Templates">
                  <textarea
                    value={templateNotes}
                    onChange={(e) => setTemplateNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. report_ready_v1 (approved), consultation_prompt_v1 (pending approval)…"
                    className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
                  />
                </Field>
              </div>

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
                  placeholder="Rate limits, approved numbers, escalation contacts…"
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Delete */}
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

          {tab === 'webhook-info' && provider && (
            <div className="space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">Paste these URLs into your Meta Business Manager webhook configuration. The verify token must match what you set in the provider config.</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Webhook Endpoints</p>
                <UrlRow label="Webhook URL (paste in Meta dashboard)" value={webhookUrl} />
                <UrlRow label="Webhook path" value={provider.webhook_url_path ?? '/api/v1/whatsapp/webhook'} />
              </div>

              {providerCode === 'meta' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
                  <p className="font-semibold text-slate-400 mb-2">Meta Business Manager Setup</p>
                  <p>1. Log in to business.facebook.com</p>
                  <p>2. Go to WhatsApp → API Setup → copy Phone Number ID and Business Account ID</p>
                  <p>3. Generate a Permanent Access Token from System Users (never use short-lived tokens)</p>
                  <p>4. Go to Webhooks → Edit → paste the Webhook URL above</p>
                  <p>5. Set Verify Token to match the value you set in this config</p>
                  <p>6. Subscribe to: <code className="text-slate-400">messages</code>, <code className="text-slate-400">message_deliveries</code>, <code className="text-slate-400">message_reads</code></p>
                  <p>7. Submit message templates at Templates → Create Template before going live</p>
                </div>
              )}

              {providerCode === 'twilio' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
                  <p className="font-semibold text-slate-400 mb-2">Twilio WhatsApp Setup</p>
                  <p>1. Log in to console.twilio.com → Messaging → WhatsApp</p>
                  <p>2. Request access to WhatsApp Business API or use Sandbox for testing</p>
                  <p>3. In Sandbox settings, set the "When a message comes in" webhook to the URL above</p>
                  <p>4. Copy Account SID and Auth Token from the dashboard</p>
                </div>
              )}

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
          )}

          {tab === 'test-logs' && (
            <CommTestLogList logs={testLogs} loading={logsLoading} />
          )}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <button onClick={handleSave} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 text-sm text-white bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl py-2.5 transition-colors font-medium">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isNew ? 'Create Provider' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
