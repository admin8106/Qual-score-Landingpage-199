import { useState, useEffect } from 'react';
import {
  X, Save, Play, RefreshCw, Star, GitBranch, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, Shield, Key, Settings, Activity, ClipboardList,
} from 'lucide-react';
import { aiProviderApi, type AiProviderConfig, type AiTestLog, type AiProviderUpdate } from '../../api/services/aiProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';

const PROVIDER_CODES = ['openai', 'anthropic', 'gemini', 'deepseek', 'custom'];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  gemini:    ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  deepseek:  ['deepseek-chat', 'deepseek-coder'],
  custom:    [],
};

type DrawerTab = 'config' | 'test-logs';

function TestStatusIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'FAILURE') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'TIMEOUT') return <Clock className="w-3.5 h-3.5 text-amber-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />;
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

function NumberInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min} max={max} step={step}
      className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm transition-colors ${checked ? 'text-emerald-400' : 'text-slate-500'}`}
    >
      {checked
        ? <ToggleRight className="w-5 h-5 text-emerald-400" />
        : <ToggleLeft className="w-5 h-5 text-slate-600" />
      }
      {label}
    </button>
  );
}

interface Props {
  provider: AiProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: AiProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function LLMProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab] = useState<DrawerTab>('config');

  const [providerCode, setProviderCode]   = useState(provider?.provider_code ?? 'openai');
  const [providerName, setProviderName]   = useState(provider?.provider_name ?? '');
  const [apiKeyInput, setApiKeyInput]     = useState('');
  const [showKey, setShowKey]             = useState(false);
  const [modelName, setModelName]         = useState(provider?.model_name ?? 'gpt-4o');
  const [baseUrl, setBaseUrl]             = useState(provider?.base_url ?? '');
  const [temperature, setTemperature]     = useState(provider?.temperature ?? 0.2);
  const [maxTokens, setMaxTokens]         = useState(provider?.max_tokens ?? 2000);
  const [timeoutSecs, setTimeoutSecs]     = useState(provider?.timeout_seconds ?? 60);
  const [retryCount, setRetryCount]       = useState(provider?.retry_count ?? 1);
  const [jsonStrict, setJsonStrict]       = useState(provider?.json_strict_mode ?? true);
  const [isActive, setIsActive]           = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback]       = useState(provider?.is_fallback ?? false);
  const [envMode, setEnvMode]             = useState(provider?.environment_mode ?? 'SANDBOX');
  const [displayOrder, setDisplayOrder]   = useState(provider?.display_order ?? 100);
  const [notes, setNotes]                 = useState(provider?.notes ?? '');

  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [runningTest, setRunningTest]     = useState(false);
  const [testError, setTestError]         = useState('');
  const [testLogs, setTestLogs]           = useState<AiTestLog[]>([]);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [logsError, setLogsError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError]     = useState('');

  useEffect(() => {
    if (provider && tab === 'test-logs') {
      loadTestLogs();
    }
  }, [tab, provider]);

  async function loadTestLogs() {
    if (!provider) return;
    setLogsLoading(true);
    setLogsError('');
    try {
      const logs = await aiProviderApi.getTestLogs(provider.id);
      setTestLogs(logs);
    } catch {
      setLogsError('Could not load test logs. Try refreshing.');
    } finally {
      setLogsLoading(false);
    }
  }

  const modelSuggestions = MODEL_SUGGESTIONS[providerCode.toLowerCase()] ?? [];

  async function handleSave() {
    if (!providerName.trim()) { setSaveError('Provider name is required.'); return; }
    if (!modelName.trim()) { setSaveError('Model name is required.'); return; }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const payload: AiProviderUpdate = {
        provider_code: providerCode,
        provider_name: providerName.trim(),
        model_name: modelName.trim(),
        base_url: baseUrl.trim() || undefined,
        temperature,
        max_tokens: maxTokens,
        timeout_seconds: timeoutSecs,
        retry_count: retryCount,
        json_strict_mode: jsonStrict,
        is_active: isActive,
        is_fallback: isFallback,
        environment_mode: envMode,
        display_order: displayOrder,
        notes: notes.trim() || undefined,
      };
      if (apiKeyInput.trim()) payload.api_key_raw = apiKeyInput.trim();

      let saved: AiProviderConfig;
      if (isNew) {
        saved = await aiProviderApi.createProvider(payload as Parameters<typeof aiProviderApi.createProvider>[0]);
      } else {
        saved = await aiProviderApi.updateProvider(provider!.id, payload);
      }

      setSaveSuccess(true);
      setApiKeyInput('');
      setTimeout(() => setSaveSuccess(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail,
        actorRole: 'ADMIN',
        providerId: saved.id,
        providerName: saved.provider_name,
        category: 'ai',
        actionType: isNew ? 'PROVIDER_CREATED' : (apiKeyInput.trim() ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: apiKeyInput.trim() ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created LLM provider "${saved.provider_name}" (${saved.provider_code}/${saved.model_name}).`
          : `Updated LLM provider "${saved.provider_name}" settings.`,
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
    setActionError('');
    try {
      await aiProviderApi.setPrimary(provider.id);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: provider.id, providerName: provider.provider_name, category: 'ai',
        actionType: 'SET_PRIMARY', fieldGroup: 'routing',
        changeSummary: `Set "${provider.provider_name}" as primary LLM provider.`,
        environmentMode: provider.environment_mode,
      });
      const updated = await aiProviderApi.getProvider(provider.id);
      if (updated) onSaved(updated);
    } catch {
      setActionError('Could not set as primary. Please try again.');
    }
    setActionLoading('');
  }

  async function handleRunTest() {
    if (!provider) return;
    setRunningTest(true);
    setTestError('');
    try {
      const log = await aiProviderApi.runConnectionTest(provider.id, adminEmail);
      setTestLogs((prev) => [log, ...prev]);
      if (tab !== 'test-logs') setTab('test-logs');
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test failed — could not reach provider.');
      if (tab !== 'test-logs') setTab('test-logs');
    }
    setRunningTest(false);
  }

  async function handleDelete() {
    if (!provider) return;
    setActionError('');
    try {
      await aiProviderApi.deleteProvider(provider.id);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: provider.id, providerName: provider.provider_name, category: 'ai',
        actionType: 'PROVIDER_DELETED', fieldGroup: 'config',
        changeSummary: `Deleted LLM provider "${provider.provider_name}" (${provider.provider_code}).`,
        environmentMode: provider.environment_mode,
      });
      onDeleted(provider.id);
      onClose();
    } catch {
      setConfirmDelete(false);
      setActionError('Delete failed. Please try again.');
    }
  }

  const currentProvider = provider;

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
              {isNew ? 'Add LLM Provider' : (currentProvider?.provider_name || 'Edit Provider')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew ? 'Configure a new AI language model provider' : `${currentProvider?.provider_code} · ${currentProvider?.model_name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="flex items-center gap-2 px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {actionError}
            <button onClick={() => setActionError('')} className="ml-auto text-red-400/60 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action bar (only for existing providers) */}
        {!isNew && currentProvider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            <button
              onClick={handleRunTest}
              disabled={runningTest}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {runningTest
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</>
                : <><Play className="w-3 h-3" /> Test Connection</>
              }
            </button>

            <button
              onClick={handleSetPrimary}
              disabled={actionLoading === 'primary' || currentProvider.is_primary}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${
                currentProvider.is_primary
                  ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                  : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <Star className={`w-3 h-3 ${currentProvider.is_primary ? 'fill-amber-400' : ''}`} />
              {currentProvider.is_primary ? 'Primary' : 'Set Primary'}
            </button>

            <div className="flex-1" />

            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              currentProvider.environment_mode === 'LIVE'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
            }`}>
              {currentProvider.environment_mode}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/[0.05] shrink-0">
          {[
            { key: 'config' as DrawerTab, label: 'Configuration', icon: Settings },
            ...(!isNew ? [{ key: 'test-logs' as DrawerTab, label: 'Test Logs', icon: ClipboardList }] : []),
          ].map((t) => {
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
          {tab === 'config' && (
            <div className="space-y-5">
              {saveError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Provider saved successfully.
                </div>
              )}

              {/* Provider identity */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Provider Identity</p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Provider Type">
                    <div className="relative">
                      <select
                        value={providerCode}
                        onChange={(e) => {
                          setProviderCode(e.target.value);
                          const suggestions = MODEL_SUGGESTIONS[e.target.value] ?? [];
                          if (suggestions.length > 0 && !suggestions.includes(modelName)) {
                            setModelName(suggestions[0]);
                          }
                        }}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40 transition-colors"
                      >
                        {PROVIDER_CODES.map((c) => (
                          <option key={c} value={c} className="bg-[#0D1120] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Environment">
                    <div className="relative">
                      <select
                        value={envMode}
                        onChange={(e) => setEnvMode(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40 transition-colors"
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
                    placeholder="e.g. OpenAI GPT-4o (Primary)"
                  />
                </FormField>
              </div>

              {/* API Key */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">API Key</p>
                  <span className="text-xs text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Encrypted at rest</span>
                </div>

                {!isNew && currentProvider?.api_key_masked && (
                  <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-400">Stored key:</span>
                    <span className="font-mono text-xs text-slate-400">{currentProvider.api_key_masked}</span>
                  </div>
                )}

                <FormField
                  label={isNew ? 'API Key' : 'New API Key'}
                  hint={isNew ? '(required)' : '(leave blank to keep existing)'}
                >
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={isNew ? 'sk-...' : 'Enter new key to replace'}
                      className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm font-mono rounded-xl px-3 py-2 pr-10 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </FormField>
              </div>

              {/* Model configuration */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Model Configuration</p>

                <FormField label="Model Name">
                  <div className="space-y-2">
                    <TextInput
                      value={modelName}
                      onChange={setModelName}
                      placeholder="gpt-4o"
                      mono
                    />
                    {modelSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {modelSuggestions.map((m) => (
                          <button
                            key={m}
                            onClick={() => setModelName(m)}
                            className={`text-xs font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                              modelName === m
                                ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                : 'text-slate-600 border-white/[0.07] hover:border-white/[0.12] hover:text-slate-400'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Base URL" hint="(optional — leave blank for default endpoint)">
                  <TextInput
                    value={baseUrl}
                    onChange={setBaseUrl}
                    placeholder="https://api.openai.com"
                    mono
                  />
                </FormField>
              </div>

              {/* Request parameters */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Request Parameters</p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Temperature" hint="(0.0 – 2.0)">
                    <NumberInput value={temperature} onChange={setTemperature} min={0} max={2} step={0.05} />
                    <div className="flex justify-between text-xs text-slate-700 mt-1 px-0.5">
                      <span>Deterministic (0.0)</span>
                      <span>Creative (2.0)</span>
                    </div>
                  </FormField>

                  <FormField label="Max Tokens">
                    <NumberInput value={maxTokens} onChange={setMaxTokens} min={100} max={16000} step={100} />
                  </FormField>

                  <FormField label="Timeout (seconds)">
                    <NumberInput value={timeoutSecs} onChange={setTimeoutSecs} min={5} max={300} step={5} />
                  </FormField>

                  <FormField label="Retry Count">
                    <NumberInput value={retryCount} onChange={setRetryCount} min={0} max={5} step={1} />
                  </FormField>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  <Toggle
                    checked={jsonStrict}
                    onChange={setJsonStrict}
                    label="JSON strict mode (response_format: json_object)"
                  />
                  <Toggle
                    checked={isActive}
                    onChange={setIsActive}
                    label="Provider active"
                  />
                  <Toggle
                    checked={isFallback}
                    onChange={setIsFallback}
                    label="Use as fallback provider"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Admin Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Cost observations, usage context, model strengths/weaknesses…"
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="block text-xs text-slate-500">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)}
                    min={1} max={999}
                    className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* Delete */}
              {!isNew && (
                <div className="pt-1 border-t border-white/[0.05]">
                  {confirmDelete ? (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-red-400 flex-1">Delete this provider? This cannot be undone.</p>
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
                      <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold">Delete</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={currentProvider?.is_primary}
                      title={currentProvider?.is_primary ? 'Cannot delete the primary provider' : ''}
                      className="inline-flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete provider
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'test-logs' && (
            <div className="space-y-2">
              {testError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{testError}</p>
                </div>
              )}
              {logsError && !testError && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-400">{logsError}</p>
                  <button onClick={loadTestLogs} className="ml-auto text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">Retry</button>
                </div>
              )}
              {logsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : !logsError && testLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <Activity className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No connection tests run yet.</p>
                  <p className="text-xs mt-1">Use "Test Connection" to verify your API key and model.</p>
                </div>
              ) : testLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                  <div className="mt-0.5">
                    <TestStatusIcon status={log.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${
                        log.status === 'SUCCESS' ? 'text-emerald-400' :
                        log.status === 'FAILURE' ? 'text-red-400' :
                        log.status === 'TIMEOUT' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {log.status}
                      </span>
                      {log.latency_ms && (
                        <span className="text-xs text-slate-600">{log.latency_ms}ms</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{log.response_summary}</p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                      {log.tested_by_admin_id && <span className="ml-2">by {log.tested_by_admin_id}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer save button */}
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
