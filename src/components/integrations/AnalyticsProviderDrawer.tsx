import { useState, useEffect } from 'react';
import { Play, RefreshCw, Save, Key, Settings, ClipboardList, Info } from 'lucide-react';
import {
  analyticsProviderConfigApi,
  type AnalyticsProviderConfig,
  type AnalyticsProviderSave,
  type GenericTestLog,
} from '../../api/services/genericProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import GenericTestLogList from './GenericTestLogList';
import {
  Field, TextInput, TextareaInput, SelectInput, SecretField,
  Toggle, SectionBox, InfoBox, SaveFooter, AlertBanner, DeleteRow,
} from './formPrimitives';

const ANALYTICS_CODES = ['ga4', 'meta_pixel', 'mixpanel', 'stub', 'custom'];
type Tab = 'config' | 'test-logs';

interface Props {
  provider: AnalyticsProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: AnalyticsProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function AnalyticsProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab]               = useState<Tab>('config');
  const [code, setCode]             = useState(provider?.provider_code ?? 'ga4');
  const [name, setName]             = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]       = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]     = useState(provider?.is_active ?? false);
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);
  const [notes, setNotes]           = useState(provider?.notes ?? '');

  const [measurementId, setMeasurementId] = useState(provider?.measurement_id ?? '');
  const [apiSecret, setApiSecret]         = useState('');
  const [pixelId, setPixelId]             = useState(provider?.pixel_id ?? '');
  const [accessToken, setAccessToken]     = useState('');
  const [testEventCode, setTestEventCode] = useState(provider?.test_event_code ?? '');
  const [mixpanelToken, setMixpanelToken] = useState('');
  const [mixpanelRegion, setMixpanelRegion] = useState(provider?.mixpanel_region ?? 'US');

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
    setLogs(await analyticsProviderConfigApi.getTestLogs(provider.id));
    setLogsLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) { setSaveErr('Display name is required.'); return; }
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const p: AnalyticsProviderSave = {
        provider_code: code, provider_name: name.trim(),
        environment_mode: envMode, is_active: isActive,
        display_order: displayOrder, notes: notes.trim() || undefined,
      };
      if (code === 'ga4') {
        if (measurementId.trim()) p.measurement_id = measurementId.trim();
        if (apiSecret.trim()) p.api_secret_raw = apiSecret.trim();
      } else if (code === 'meta_pixel') {
        if (pixelId.trim()) p.pixel_id = pixelId.trim();
        if (accessToken.trim()) p.access_token_raw = accessToken.trim();
        if (testEventCode.trim()) p.test_event_code = testEventCode.trim();
      } else if (code === 'mixpanel') {
        if (mixpanelToken.trim()) p.mixpanel_token_raw = mixpanelToken.trim();
        if (mixpanelRegion.trim()) p.mixpanel_region = mixpanelRegion.trim();
      }
      const saved = isNew ? await analyticsProviderConfigApi.create(p) : await analyticsProviderConfigApi.update(provider!.id, p);
      setSaveOk(true); setApiSecret(''); setAccessToken(''); setMixpanelToken('');
      setTimeout(() => setSaveOk(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'analytics',
        actionType: isNew ? 'PROVIDER_CREATED' : 'SETTINGS_UPDATED',
        fieldGroup: 'config',
        changeSummary: isNew
          ? `Created analytics provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated analytics provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) { setSaveErr(e instanceof Error ? e.message : 'Save failed.'); }
    setSaving(false);
  }

  async function handleTest() {
    if (!provider) return;
    setTesting(true);
    try {
      const log = await analyticsProviderConfigApi.runTest(provider.id, adminEmail);
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
            <p className="text-sm font-semibold text-white">{isNew ? 'Add Analytics Provider' : (provider?.provider_name || 'Edit Analytics')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{isNew ? 'Configure a tracking provider' : `${provider?.provider_code} · ${provider?.environment_mode}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><span className="text-base leading-none">×</span></button>
        </div>

        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0">
            <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-1.5 text-xs text-white bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
              {testing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</> : <><Play className="w-3 h-3" /> Test Config</>}
            </button>
            <InfoBox color="sky">
              <span className="text-xs text-sky-300/70">All active analytics providers fire simultaneously — there is no primary/fallback concept for analytics.</span>
            </InfoBox>
          </div>
        )}

        <div className="flex border-b border-white/[0.05] shrink-0">
          {TABS.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as Tab)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
                    <SelectInput value={code} onChange={setCode} options={ANALYTICS_CODES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} />
                  </Field>
                  <Field label="Environment">
                    <SelectInput value={envMode} onChange={setEnvMode} options={[{ value: 'SANDBOX', label: 'Sandbox' }, { value: 'LIVE', label: 'Live' }]} />
                  </Field>
                </div>
                <Field label="Display Name">
                  <TextInput value={name} onChange={setName} placeholder="e.g. GA4 – Production" />
                </Field>
              </SectionBox>

              {code === 'ga4' && (
                <SectionBox title="Google Analytics 4" icon={Key} iconColor="text-orange-400">
                  <Field label="Measurement ID" hint="(required)">
                    <TextInput value={measurementId} onChange={setMeasurementId} placeholder="G-XXXXXXXXXX" mono />
                  </Field>
                  <SecretField label="Measurement Protocol API Secret" hint="(for server-side events, optional)" maskedValue={provider?.api_secret_masked} value={apiSecret} onChange={setApiSecret} placeholder="API secret from GA4 Data Streams" />
                  <InfoBox>
                    Measurement ID: GA4 Admin → Data Streams → Web → Measurement ID. For server-side tracking, also create an API Secret under the same Data Stream settings.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'meta_pixel' && (
                <SectionBox title="Meta Pixel / Conversions API" icon={Key} iconColor="text-orange-400">
                  <Field label="Pixel ID" hint="(required)">
                    <TextInput value={pixelId} onChange={setPixelId} placeholder="1234567890123456" mono />
                  </Field>
                  <SecretField label="Conversions API Access Token" hint="(for CAPI, optional)" maskedValue={provider?.access_token_masked} value={accessToken} onChange={setAccessToken} placeholder="Meta CAPI system user access token" />
                  <Field label="Test Event Code" hint="(for testing in Meta Events Manager)">
                    <TextInput value={testEventCode} onChange={setTestEventCode} placeholder="TEST12345" mono />
                  </Field>
                  <InfoBox>
                    Pixel ID: Meta Events Manager → Your Pixel. For Conversions API, go to Events Manager → Settings → Conversions API → Generate Access Token.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'mixpanel' && (
                <SectionBox title="Mixpanel" icon={Key} iconColor="text-orange-400">
                  <SecretField label="Project Token" maskedValue={provider?.mixpanel_token_masked} value={mixpanelToken} onChange={setMixpanelToken} placeholder="Mixpanel project token" />
                  <Field label="Data Region">
                    <SelectInput value={mixpanelRegion} onChange={setMixpanelRegion} options={[{ value: 'US', label: 'US' }, { value: 'EU', label: 'EU (GDPR)' }]} />
                  </Field>
                  <InfoBox>
                    Project token: Mixpanel → Settings → Project. For EU data residency, select EU region.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'stub' && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Stub Provider</p>
                    <p className="text-xs text-slate-600 mt-1">Events logged to browser console only. No external tracking.</p>
                  </div>
                </div>
              )}

              <SectionBox title="Status">
                <Toggle checked={isActive} onChange={setIsActive} label="Provider active (fires alongside all other active providers)" />
              </SectionBox>

              <SectionBox title="Admin Notes">
                <TextareaInput value={notes} onChange={setNotes} placeholder="Event naming conventions, property limits, sampling notes…" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none" />
                </div>
              </SectionBox>

              {!isNew && <DeleteRow onConfirm={async () => { await analyticsProviderConfigApi.delete(provider!.id); onDeleted(provider!.id); onClose(); }} />}
            </div>
          )}
          {tab === 'test-logs' && <GenericTestLogList logs={logs} loading={logsLoading} />}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <SaveFooter saving={saving} isNew={isNew} onSave={handleSave} accentBg="bg-orange-700 hover:bg-orange-600" />
          </div>
        )}
      </div>
    </div>
  );
}
