import { useState, useEffect } from 'react';
import {
  X, Save, Play, RefreshCw, Star, GitBranch, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Key, Shield,
  Copy, ExternalLink, Info, Settings, ClipboardList, ChevronDown,
} from 'lucide-react';
import {
  paymentProviderApi,
  type PaymentProviderConfig,
  type PaymentTestLog,
  type PaymentProviderUpdate,
} from '../../api/services/paymentProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';

const PROVIDER_CODES = ['payu', 'razorpay', 'mock', 'stripe', 'custom'];

const PAYU_URLS = {
  test: 'https://test.payu.in/_payment',
  live: 'https://secure.payu.in/_payment',
};

type DrawerTab = 'config' | 'webhook-info' | 'test-logs';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
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

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

function TextInput({ value, onChange, placeholder, mono, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  mono?: boolean; type?: string; disabled?: boolean;
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

function SecretField({
  label, hint, maskedValue, placeholder, value, onChange,
}: {
  label: string; hint?: string; maskedValue?: string | null;
  placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <FormField label={label} hint={hint}>
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
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </FormField>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm transition-colors ${checked ? 'text-emerald-400' : 'text-slate-500'}`}
    >
      {checked ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
      {label}
    </button>
  );
}

function CheckItem({ check }: { check: { name: string; passed: boolean; detail?: string } }) {
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border ${
      check.passed
        ? 'bg-emerald-500/5 border-emerald-500/15'
        : 'bg-red-500/5 border-red-500/15'
    }`}>
      {check.passed
        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
      }
      <div className="min-w-0">
        <p className={`text-xs font-medium ${check.passed ? 'text-emerald-300' : 'text-red-300'}`}>{check.name}</p>
        {check.detail && <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>}
      </div>
    </div>
  );
}

interface Props {
  provider: PaymentProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  appBaseUrl: string;
  onClose: () => void;
  onSaved: (p: PaymentProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function PaymentProviderDrawer({
  provider, isNew, adminEmail, appBaseUrl, onClose, onSaved, onDeleted,
}: Props) {
  const [tab, setTab] = useState<DrawerTab>('config');

  const [providerCode, setProviderCode] = useState(provider?.provider_code ?? 'razorpay');
  const [providerName, setProviderName] = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]           = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]         = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback]     = useState(provider?.is_fallback ?? false);
  const [notes, setNotes]               = useState(provider?.notes ?? '');
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);

  const [rzpKeyId, setRzpKeyId]                 = useState(provider?.razorpay_key_id ?? '');
  const [rzpKeySecretNew, setRzpKeySecretNew]   = useState('');
  const [rzpWebhookNew, setRzpWebhookNew]       = useState('');

  const [payuMerchantKeyNew, setPayuMerchantKeyNew] = useState('');
  const [payuSaltNew, setPayuSaltNew]               = useState('');
  const [payuBaseUrl, setPayuBaseUrl]               = useState(provider?.payu_base_url ?? '');
  const [payuSuccessUrl, setPayuSuccessUrl]         = useState(provider?.payu_success_url ?? '');
  const [payuFailureUrl, setPayuFailureUrl]         = useState(provider?.payu_failure_url ?? '');

  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [testLogs, setTestLogs]     = useState<PaymentTestLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (provider && tab === 'test-logs') loadLogs();
  }, [tab, provider]);

  async function loadLogs() {
    if (!provider) return;
    setLogsLoading(true);
    const logs = await paymentProviderApi.getTestLogs(provider.id);
    setTestLogs(logs);
    setLogsLoading(false);
  }

  const webhookFullUrl = `${appBaseUrl}/api/v1/payments/webhook`;

  async function handleSave() {
    if (!providerName.trim()) { setSaveError('Provider name is required.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const payload: PaymentProviderUpdate = {
        provider_code: providerCode,
        provider_name: providerName.trim(),
        environment_mode: envMode,
        is_active: isActive,
        is_fallback: isFallback,
        notes: notes.trim() || undefined,
        display_order: displayOrder,
        webhook_url_path: '/api/v1/payments/webhook',
      };

      if (providerCode === 'razorpay') {
        if (rzpKeyId.trim()) payload.razorpay_key_id = rzpKeyId.trim();
        if (rzpKeySecretNew.trim()) payload.razorpay_key_secret_raw = rzpKeySecretNew.trim();
        if (rzpWebhookNew.trim()) payload.razorpay_webhook_secret_raw = rzpWebhookNew.trim();
      } else if (providerCode === 'payu') {
        if (payuMerchantKeyNew.trim()) payload.payu_merchant_key_raw = payuMerchantKeyNew.trim();
        if (payuSaltNew.trim()) payload.payu_salt_raw = payuSaltNew.trim();
        if (payuBaseUrl.trim()) payload.payu_base_url = payuBaseUrl.trim();
        if (payuSuccessUrl.trim()) payload.payu_success_url = payuSuccessUrl.trim();
        if (payuFailureUrl.trim()) payload.payu_failure_url = payuFailureUrl.trim();
      }

      let saved: PaymentProviderConfig;
      if (isNew) {
        saved = await paymentProviderApi.createProvider(payload as Parameters<typeof paymentProviderApi.createProvider>[0]);
      } else {
        saved = await paymentProviderApi.updateProvider(provider!.id, payload);
      }
      setSaveSuccess(true);
      const credentialUpdated = rzpKeySecretNew.trim() || rzpWebhookNew.trim() || payuMerchantKeyNew.trim() || payuSaltNew.trim();
      setRzpKeySecretNew('');
      setRzpWebhookNew('');
      setPayuMerchantKeyNew('');
      setPayuSaltNew('');
      setTimeout(() => setSaveSuccess(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'payments',
        actionType: isNew ? 'PROVIDER_CREATED' : (credentialUpdated ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: credentialUpdated ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created payment provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated payment provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save provider.');
    }
    setSaving(false);
  }

  async function handleSetPrimary() {
    if (!provider) return;
    setActionLoading('primary');
    try {
      await paymentProviderApi.setPrimary(provider.id, provider.environment_mode);
      const updated = await paymentProviderApi.getProvider(provider.id);
      if (updated) onSaved(updated);
    } catch { /* ignore */ }
    setActionLoading('');
  }

  async function handleRunTest() {
    if (!provider) return;
    setRunningTest(true);
    try {
      const log = await paymentProviderApi.runConfigTest(provider.id, adminEmail);
      setTestLogs((prev) => [log, ...prev]);
      setTab('test-logs');
    } catch { /* ignore */ }
    setRunningTest(false);
  }

  async function handleDelete() {
    if (!provider) return;
    await paymentProviderApi.deleteProvider(provider.id);
    await integrationAuditApi.logAction({
      actorEmail: adminEmail, actorRole: 'ADMIN',
      providerId: provider.id, providerName: provider.provider_name, category: 'payments',
      actionType: 'PROVIDER_DELETED', fieldGroup: 'config',
      changeSummary: `Deleted payment provider "${provider.provider_name}" (${provider.provider_code}).`,
      environmentMode: provider.environment_mode,
    });
    onDeleted(provider.id);
    onClose();
  }

  const TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: 'config',       label: 'Configuration',  icon: Settings },
    ...(!isNew ? [
      { key: 'webhook-info' as DrawerTab, label: 'Webhook / URLs', icon: ExternalLink },
      { key: 'test-logs' as DrawerTab,    label: 'Test Logs',      icon: ClipboardList },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">
              {isNew ? 'Add Payment Provider' : (provider?.provider_name || 'Edit Provider')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew
                ? 'Configure a new payment gateway'
                : `${provider?.provider_code} · ${provider?.environment_mode}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            <button
              onClick={handleRunTest}
              disabled={runningTest}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {runningTest
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</>
                : <><Play className="w-3 h-3" /> Test Config</>
              }
            </button>

            <button
              onClick={handleSetPrimary}
              disabled={actionLoading === 'primary' || provider.is_primary}
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
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <TIcon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Config tab ────────────────────────────────────────────────── */}
          {tab === 'config' && (
            <div className="space-y-5">
              {saveError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved successfully.
                </div>
              )}

              {/* Identity */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Provider Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Provider Type">
                    <div className="relative">
                      <select
                        value={providerCode}
                        onChange={(e) => setProviderCode(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
                      >
                        {PROVIDER_CODES.map((c) => (
                          <option key={c} value={c} className="bg-[#0D1120] capitalize">{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                  </FormField>
                  <FormField label="Environment">
                    <div className="relative">
                      <select
                        value={envMode}
                        onChange={(e) => {
                          setEnvMode(e.target.value);
                          if (providerCode === 'payu') {
                            setPayuBaseUrl(e.target.value === 'LIVE' ? PAYU_URLS.live : PAYU_URLS.test);
                          }
                        }}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
                      >
                        <option value="SANDBOX" className="bg-[#0D1120]">Sandbox</option>
                        <option value="LIVE" className="bg-[#0D1120]">Live</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                  </FormField>
                </div>
                <FormField label="Display Name">
                  <TextInput
                    value={providerName}
                    onChange={setProviderName}
                    placeholder={`e.g. Razorpay ${envMode === 'LIVE' ? 'Production' : 'Test'}`}
                  />
                </FormField>
              </div>

              {/* Razorpay fields */}
              {providerCode === 'razorpay' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Razorpay Credentials</p>
                  </div>

                  <FormField label="Key ID" hint="(public — safe to view)">
                    <TextInput
                      value={rzpKeyId}
                      onChange={setRzpKeyId}
                      placeholder="rzp_test_xxxxxxxxxxxx"
                      mono
                    />
                    <p className="text-xs text-slate-700 mt-1">
                      Sandbox keys start with <code className="text-slate-500">rzp_test_</code>, live keys with <code className="text-slate-500">rzp_live_</code>
                    </p>
                  </FormField>

                  <SecretField
                    label="Key Secret"
                    hint={provider?.razorpay_key_secret_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.razorpay_key_secret_masked}
                    value={rzpKeySecretNew}
                    onChange={setRzpKeySecretNew}
                    placeholder="Your Razorpay key secret"
                  />

                  <SecretField
                    label="Webhook Secret"
                    hint="(optional but recommended)"
                    maskedValue={provider?.razorpay_webhook_secret_masked}
                    value={rzpWebhookNew}
                    onChange={setRzpWebhookNew}
                    placeholder="Webhook signature secret from dashboard"
                  />
                </div>
              )}

              {/* PayU fields */}
              {providerCode === 'payu' && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">PayU Credentials</p>
                  </div>

                  <SecretField
                    label="Merchant Key"
                    hint={provider?.payu_merchant_key_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.payu_merchant_key_masked}
                    value={payuMerchantKeyNew}
                    onChange={setPayuMerchantKeyNew}
                    placeholder="Your PayU merchant key"
                  />

                  <SecretField
                    label="Salt / Secret"
                    hint={provider?.payu_salt_masked ? '(leave blank to keep existing)' : '(required)'}
                    maskedValue={provider?.payu_salt_masked}
                    value={payuSaltNew}
                    onChange={setPayuSaltNew}
                    placeholder="Your PayU salt"
                  />

                  <FormField label="Base URL">
                    <div className="space-y-2">
                      <TextInput
                        value={payuBaseUrl}
                        onChange={setPayuBaseUrl}
                        placeholder="https://test.payu.in/_payment"
                        mono
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPayuBaseUrl(PAYU_URLS.test)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono ${payuBaseUrl === PAYU_URLS.test ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-slate-600 border-white/[0.07] hover:border-white/[0.12]'}`}
                        >
                          Test
                        </button>
                        <button
                          onClick={() => setPayuBaseUrl(PAYU_URLS.live)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono ${payuBaseUrl === PAYU_URLS.live ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-slate-600 border-white/[0.07] hover:border-white/[0.12]'}`}
                        >
                          Live
                        </button>
                      </div>
                    </div>
                  </FormField>

                  <FormField label="Success Callback URL" hint="(paste in PayU dashboard)">
                    <TextInput
                      value={payuSuccessUrl}
                      onChange={setPayuSuccessUrl}
                      placeholder={`${appBaseUrl}/api/v1/payments/webhook`}
                    />
                  </FormField>

                  <FormField label="Failure Callback URL" hint="(paste in PayU dashboard)">
                    <TextInput
                      value={payuFailureUrl}
                      onChange={setPayuFailureUrl}
                      placeholder={`${appBaseUrl}/api/v1/payments/webhook`}
                    />
                  </FormField>
                </div>
              )}

              {/* Mock info */}
              {providerCode === 'mock' && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Mock Gateway — No credentials required</p>
                      <p className="text-xs text-slate-600 mt-1">
                        The mock gateway is built in to the backend. It always approves payments instantly.
                        Use only for development and testing. No real money movement occurs.
                      </p>
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
                  rows={3}
                  placeholder="Settlement cycle, fee rates, known issues, escalation contacts…"
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)}
                    min={1} max={999}
                    className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500/40"
                  />
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
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={provider?.is_primary}
                      title={provider?.is_primary ? 'Cannot delete the primary provider' : ''}
                      className="inline-flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" /> Delete provider
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Webhook / URLs tab ─────────────────────────────────────────── */}
          {tab === 'webhook-info' && provider && (
            <div className="space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  Paste these URLs into your payment provider's dashboard. They must match exactly or
                  payment callbacks and webhook verification will fail.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Webhook Endpoint</p>
                <UrlRow label="Webhook / Callback URL (paste in provider dashboard)" value={webhookFullUrl} />
                <UrlRow label="Webhook path (backend route)" value={provider.webhook_url_path ?? '/api/v1/payments/webhook'} />
              </div>

              {provider.provider_code === 'payu' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">PayU Callback URLs</p>
                  {provider.payu_success_url && (
                    <UrlRow label="Success callback URL" value={provider.payu_success_url} />
                  )}
                  {provider.payu_failure_url && (
                    <UrlRow label="Failure callback URL" value={provider.payu_failure_url} />
                  )}
                  {provider.payu_base_url && (
                    <UrlRow label="PayU base URL (gateway endpoint)" value={provider.payu_base_url} />
                  )}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-400">PayU Setup Checklist</p>
                    <p>1. Log in to PayU merchant dashboard</p>
                    <p>2. Go to Settings → Technical Details</p>
                    <p>3. Set "Success URL" and "Failure URL" to the callback URLs above</p>
                    <p>4. Note your Merchant Key and Salt from the dashboard</p>
                    <p>5. Use Test merchant key for sandbox, Live key for production</p>
                  </div>
                </div>
              )}

              {provider.provider_code === 'razorpay' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Razorpay Setup</p>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-400">Razorpay Setup Checklist</p>
                    <p>1. Log in to Razorpay dashboard</p>
                    <p>2. Go to Settings → API Keys → Generate Key</p>
                    <p>3. Copy Key ID and Key Secret</p>
                    <p>4. Go to Settings → Webhooks → Add New Webhook</p>
                    <p>5. Paste the webhook URL above, enable <code className="text-slate-400">payment.captured</code> and <code className="text-slate-400">payment.failed</code> events</p>
                    <p>6. Copy the webhook secret and save it in the Webhook Secret field</p>
                    <p>7. Use Test keys for sandbox environment</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Status</p>
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

          {/* ── Test logs tab ──────────────────────────────────────────────── */}
          {tab === 'test-logs' && (
            <div className="space-y-3">
              {logsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : testLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No config tests run yet.</p>
                  <p className="text-xs mt-1">Use "Test Config" to validate credentials and settings.</p>
                </div>
              ) : testLogs.map((log) => (
                <div key={log.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    {log.status === 'PASS'
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />
                    }
                    <span className={`text-xs font-medium ${log.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>{log.status}</span>
                    <span className="text-xs text-slate-600 ml-auto">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-slate-500">{log.summary}</p>
                  {Array.isArray(log.checks_run) && log.checks_run.length > 0 && (
                    <div className="space-y-1.5">
                      {log.checks_run.map((check, i) => (
                        <CheckItem key={i} check={check} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save footer */}
        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2.5 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isNew ? 'Create Provider' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
