import { useState, useEffect } from 'react';
import { Play, RefreshCw, Star, Save, Key, Settings, ClipboardList, Info } from 'lucide-react';
import {
  crmProviderApi,
  type CrmProviderConfig,
  type CrmProviderSave,
  type GenericTestLog,
} from '../../api/services/genericProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import GenericTestLogList from './GenericTestLogList';
import {
  Field, TextInput, TextareaInput, SelectInput, SecretField,
  Toggle, SectionBox, InfoBox, SaveFooter, AlertBanner, DeleteRow,
} from './formPrimitives';

const CRM_CODES = ['zoho', 'hubspot', 'salesforce', 'webhook', 'stub', 'custom'];
const MAPPING_MODES = [
  { value: 'WEBHOOK_PUSH', label: 'Webhook Push' },
  { value: 'FIELD_MAP', label: 'Field Mapping' },
  { value: 'NATIVE_SDK', label: 'Native SDK' },
];
type Tab = 'config' | 'test-logs';

interface Props {
  provider: CrmProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: CrmProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function CrmProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('config');

  const [code, setCode]             = useState(provider?.provider_code ?? 'webhook');
  const [name, setName]             = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]       = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]     = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback] = useState(provider?.is_fallback ?? false);
  const [baseUrl, setBaseUrl]       = useState(provider?.base_url ?? '');
  const [instanceUrl, setInstanceUrl] = useState(provider?.instance_url ?? '');
  const [authToken, setAuthToken]   = useState('');
  const [clientId, setClientId]     = useState(provider?.client_id ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [apiKey, setApiKey]         = useState('');
  const [mappingMode, setMappingMode] = useState(provider?.mapping_mode ?? 'WEBHOOK_PUSH');
  const [syncContact, setSyncContact] = useState(provider?.sync_contact ?? true);
  const [syncDeal, setSyncDeal]     = useState(provider?.sync_deal ?? false);
  const [syncActivity, setSyncActivity] = useState(provider?.sync_activity ?? false);
  const [pipelineId, setPipelineId] = useState(provider?.pipeline_id ?? '');
  const [ownerId, setOwnerId]       = useState(provider?.owner_id ?? '');
  const [notes, setNotes]           = useState(provider?.notes ?? '');
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);

  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [saveOk, setSaveOk]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [logs, setLogs]             = useState<GenericTestLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { if (provider && tab === 'test-logs') loadLogs(); }, [tab, provider]);

  async function loadLogs() {
    if (!provider) return;
    setLogsLoading(true);
    setLogs(await crmProviderApi.getTestLogs(provider.id));
    setLogsLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) { setSaveErr('Display name is required.'); return; }
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const p: CrmProviderSave = {
        provider_code: code, provider_name: name.trim(),
        environment_mode: envMode, is_active: isActive, is_fallback: isFallback,
        display_order: displayOrder, notes: notes.trim() || undefined,
        mapping_mode: mappingMode, sync_contact: syncContact, sync_deal: syncDeal, sync_activity: syncActivity,
        pipeline_id: pipelineId.trim() || undefined, owner_id: ownerId.trim() || undefined,
      };
      if (baseUrl.trim()) p.base_url = baseUrl.trim();
      if (instanceUrl.trim()) p.instance_url = instanceUrl.trim();
      if (authToken.trim()) p.auth_token_raw = authToken.trim();
      if (clientId.trim()) p.client_id = clientId.trim();
      if (clientSecret.trim()) p.client_secret_raw = clientSecret.trim();
      if (apiKey.trim()) p.api_key_raw = apiKey.trim();

      const saved = isNew ? await crmProviderApi.create(p) : await crmProviderApi.update(provider!.id, p);
      setSaveOk(true); setAuthToken(''); setClientSecret(''); setApiKey('');
      setTimeout(() => setSaveOk(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'crm',
        actionType: isNew ? 'PROVIDER_CREATED' : 'SETTINGS_UPDATED',
        fieldGroup: 'config',
        changeSummary: isNew
          ? `Created CRM provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated CRM provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) { setSaveErr(e instanceof Error ? e.message : 'Save failed.'); }
    setSaving(false);
  }

  async function handleSetPrimary() {
    if (!provider) return;
    await crmProviderApi.setPrimary(provider.id, provider.environment_mode);
    const u = await crmProviderApi.get(provider.id);
    if (u) onSaved(u);
  }

  async function handleTest() {
    if (!provider) return;
    setTesting(true);
    try {
      const log = await crmProviderApi.runTest(provider.id, adminEmail);
      setLogs((prev) => [log, ...prev]);
      setTab('test-logs');
    } catch { /* ignore */ }
    setTesting(false);
  }

  const TABS = [
    { key: 'config', label: 'Configuration', icon: Settings },
    ...(!isNew ? [{ key: 'test-logs', label: 'Test Logs', icon: ClipboardList }] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">{isNew ? 'Add CRM Provider' : (provider?.provider_name || 'Edit CRM')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{isNew ? 'Configure a CRM integration' : `${provider?.provider_code} · ${provider?.environment_mode}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><span className="text-base leading-none">×</span></button>
        </div>

        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-1.5 text-xs text-white bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              {testing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</> : <><Play className="w-3 h-3" /> Test Config</>}
            </button>
            <button onClick={handleSetPrimary} disabled={provider.is_primary} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${provider.is_primary ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'}`}>
              <Star className={`w-3 h-3 ${provider.is_primary ? 'fill-amber-400' : ''}`} />
              {provider.is_primary ? 'Primary' : 'Set Primary'}
            </button>
          </div>
        )}

        <div className="flex border-b border-white/[0.05] shrink-0">
          {TABS.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as Tab)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                <TIcon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'config' && (
            <div className="space-y-5">
              {saveErr && <AlertBanner text={saveErr} type="error" />}
              {saveOk && <AlertBanner text="Saved." type="success" />}

              <SectionBox title="Provider Identity">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Provider Type">
                    <SelectInput value={code} onChange={setCode} options={CRM_CODES.map((c) => ({ value: c, label: c }))} />
                  </Field>
                  <Field label="Environment">
                    <SelectInput value={envMode} onChange={setEnvMode} options={[{ value: 'SANDBOX', label: 'Sandbox' }, { value: 'LIVE', label: 'Live' }]} />
                  </Field>
                </div>
                <Field label="Display Name">
                  <TextInput value={name} onChange={setName} placeholder="e.g. Zoho CRM – Production" />
                </Field>
              </SectionBox>

              {(code === 'webhook') && (
                <SectionBox title="Webhook Endpoint" icon={Key} iconColor="text-amber-400">
                  <Field label="Webhook URL" hint="(POST endpoint)">
                    <TextInput value={baseUrl} onChange={setBaseUrl} placeholder="https://your-crm.com/api/webhooks/leads" mono />
                  </Field>
                  <SecretField label="Authorization Token" hint="(optional)" maskedValue={provider?.auth_token_masked} value={authToken} onChange={setAuthToken} placeholder="Bearer token or API key" />
                </SectionBox>
              )}

              {code === 'zoho' && (
                <SectionBox title="Zoho CRM Credentials" icon={Key} iconColor="text-amber-400">
                  <Field label="Instance URL">
                    <TextInput value={instanceUrl} onChange={setInstanceUrl} placeholder="https://crm.zoho.in" mono />
                  </Field>
                  <Field label="Client ID">
                    <TextInput value={clientId} onChange={setClientId} placeholder="1000.XXXXXXXX" mono />
                  </Field>
                  <SecretField label="Client Secret" maskedValue={provider?.client_secret_masked} value={clientSecret} onChange={setClientSecret} placeholder="Zoho OAuth client secret" />
                  <InfoBox>
                    Set up OAuth in Zoho API Console → Add Client. Use the Access Token refresh flow and store the refresh token for long-lived access.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'hubspot' && (
                <SectionBox title="HubSpot Credentials" icon={Key} iconColor="text-amber-400">
                  <Field label="Base URL" hint="(usually https://api.hubapi.com)">
                    <TextInput value={baseUrl} onChange={setBaseUrl} placeholder="https://api.hubapi.com" mono />
                  </Field>
                  <SecretField label="Private App API Key" maskedValue={provider?.api_key_masked} value={apiKey} onChange={setApiKey} placeholder="pat-eu1-XXXXXXXX" />
                  <InfoBox>
                    Create a Private App in HubSpot → Settings → Integrations → Private Apps. Grant Contacts and Deals scopes.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'salesforce' && (
                <SectionBox title="Salesforce Credentials" icon={Key} iconColor="text-amber-400">
                  <Field label="Instance URL">
                    <TextInput value={instanceUrl} onChange={setInstanceUrl} placeholder="https://yourorg.salesforce.com" mono />
                  </Field>
                  <Field label="Client ID (Consumer Key)">
                    <TextInput value={clientId} onChange={setClientId} placeholder="3MVG9..." mono />
                  </Field>
                  <SecretField label="Client Secret (Consumer Secret)" maskedValue={provider?.client_secret_masked} value={clientSecret} onChange={setClientSecret} placeholder="Salesforce connected app secret" />
                  <InfoBox>
                    Create a Connected App in Salesforce Setup → App Manager. Enable OAuth with api, refresh_token scopes.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'stub' && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Stub Provider</p>
                      <p className="text-xs text-slate-600 mt-1">Logs CRM push payloads to the backend console. No real data is sent to any CRM.</p>
                    </div>
                  </div>
                </div>
              )}

              <SectionBox title="Sync Settings">
                <Field label="Mapping Mode">
                  <SelectInput value={mappingMode} onChange={setMappingMode} options={MAPPING_MODES} />
                </Field>
                <div className="space-y-2.5">
                  <Toggle checked={syncContact} onChange={setSyncContact} label="Sync contacts" />
                  <Toggle checked={syncDeal} onChange={setSyncDeal} label="Sync deals / opportunities" />
                  <Toggle checked={syncActivity} onChange={setSyncActivity} label="Sync activities / notes" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Default Pipeline ID" hint="(optional)">
                    <TextInput value={pipelineId} onChange={setPipelineId} placeholder="pipeline-id" mono />
                  </Field>
                  <Field label="Default Owner ID" hint="(optional)">
                    <TextInput value={ownerId} onChange={setOwnerId} placeholder="owner-id" mono />
                  </Field>
                </div>
              </SectionBox>

              <SectionBox title="Status">
                <Toggle checked={isActive} onChange={setIsActive} label="Provider active" />
                <Toggle checked={isFallback} onChange={setIsFallback} label="Use as fallback" />
              </SectionBox>

              <SectionBox title="Admin Notes">
                <TextareaInput value={notes} onChange={setNotes} placeholder="Rate limits, data mappings, escalation contacts…" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none" />
                </div>
              </SectionBox>

              {!isNew && <DeleteRow onConfirm={async () => { await crmProviderApi.delete(provider!.id); onDeleted(provider!.id); onClose(); }} disabled={provider?.is_primary} />}
            </div>
          )}
          {tab === 'test-logs' && <GenericTestLogList logs={logs} loading={logsLoading} />}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <SaveFooter saving={saving} isNew={isNew} onSave={handleSave} accentBg="bg-amber-700 hover:bg-amber-600" />
          </div>
        )}
      </div>
    </div>
  );
}
