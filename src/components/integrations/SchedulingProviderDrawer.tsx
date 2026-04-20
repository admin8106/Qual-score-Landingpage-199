import { useState, useEffect } from 'react';
import { Play, RefreshCw, Star, Settings, ClipboardList, Info, Key } from 'lucide-react';
import {
  schedulingProviderApi,
  type SchedulingProviderConfig,
  type SchedulingProviderSave,
  type GenericTestLog,
} from '../../api/services/genericProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import GenericTestLogList from './GenericTestLogList';
import {
  Field, TextInput, TextareaInput, SelectInput, SecretField,
  Toggle, SectionBox, InfoBox, SaveFooter, AlertBanner, DeleteRow,
} from './formPrimitives';

const SCHEDULING_CODES = ['calendly', 'google_calendar', 'stub', 'custom'];
type Tab = 'config' | 'test-logs';

interface Props {
  provider: SchedulingProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: SchedulingProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function SchedulingProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab]               = useState<Tab>('config');
  const [code, setCode]             = useState(provider?.provider_code ?? 'calendly');
  const [name, setName]             = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]       = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]     = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback] = useState(provider?.is_fallback ?? false);
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);
  const [notes, setNotes]           = useState(provider?.notes ?? '');

  const [calendarId, setCalendarId] = useState(provider?.calendar_id ?? '');
  const [oauthAccess, setOauthAccess] = useState('');
  const [oauthRefresh, setOauthRefresh] = useState('');
  const [apiKey, setApiKey]         = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [bookingUrl, setBookingUrl] = useState(provider?.booking_url ?? '');
  const [eventTypeUri, setEventTypeUri] = useState(provider?.event_type_uri ?? '');
  const [timezone, setTimezone]     = useState(provider?.timezone ?? 'Asia/Kolkata');

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
    setLogs(await schedulingProviderApi.getTestLogs(provider.id));
    setLogsLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) { setSaveErr('Display name is required.'); return; }
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const p: SchedulingProviderSave = {
        provider_code: code, provider_name: name.trim(),
        environment_mode: envMode, is_active: isActive, is_fallback: isFallback,
        display_order: displayOrder, notes: notes.trim() || undefined,
        timezone: timezone.trim() || undefined,
        booking_url: bookingUrl.trim() || undefined,
        event_type_uri: eventTypeUri.trim() || undefined,
        calendar_id: calendarId.trim() || undefined,
      };
      if (apiKey.trim()) p.api_key_raw = apiKey.trim();
      if (oauthAccess.trim()) p.oauth_access_token_raw = oauthAccess.trim();
      if (oauthRefresh.trim()) p.oauth_refresh_token_raw = oauthRefresh.trim();
      if (webhookSecret.trim()) p.webhook_signing_secret_raw = webhookSecret.trim();

      const saved = isNew ? await schedulingProviderApi.create(p) : await schedulingProviderApi.update(provider!.id, p);
      setSaveOk(true); setApiKey(''); setOauthAccess(''); setOauthRefresh(''); setWebhookSecret('');
      setTimeout(() => setSaveOk(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'scheduling',
        actionType: isNew ? 'PROVIDER_CREATED' : (apiKey.trim() || oauthAccess.trim() ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: apiKey.trim() || oauthAccess.trim() ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created scheduling provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated scheduling provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) { setSaveErr(e instanceof Error ? e.message : 'Save failed.'); }
    setSaving(false);
  }

  async function handleSetPrimary() {
    if (!provider) return;
    await schedulingProviderApi.setPrimary(provider.id, provider.environment_mode);
    const u = await schedulingProviderApi.get(provider.id);
    if (u) onSaved(u);
  }

  async function handleTest() {
    if (!provider) return;
    setTesting(true);
    try {
      const log = await schedulingProviderApi.runTest(provider.id, adminEmail);
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
            <p className="text-sm font-semibold text-white">{isNew ? 'Add Scheduling Provider' : (provider?.provider_name || 'Edit Scheduling')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{isNew ? 'Configure a calendar / booking provider' : `${provider?.provider_code} · ${provider?.environment_mode}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><span className="text-base leading-none">×</span></button>
        </div>

        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0">
            <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-1.5 text-xs text-white bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
              {testing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</> : <><Play className="w-3 h-3" /> Test Config</>}
            </button>
            <button onClick={handleSetPrimary} disabled={provider.is_primary} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${provider.is_primary ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'}`}>
              <Star className={`w-3 h-3 ${provider.is_primary ? 'fill-amber-400' : ''}`} />
              {provider.is_primary ? 'Primary' : 'Set Primary'}
            </button>
          </div>
        )}

        <div className="flex border-b border-white/[0.05] shrink-0">
          {TABS.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as Tab)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
                    <SelectInput value={code} onChange={setCode} options={SCHEDULING_CODES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} />
                  </Field>
                  <Field label="Environment">
                    <SelectInput value={envMode} onChange={setEnvMode} options={[{ value: 'SANDBOX', label: 'Sandbox' }, { value: 'LIVE', label: 'Live' }]} />
                  </Field>
                </div>
                <Field label="Display Name">
                  <TextInput value={name} onChange={setName} placeholder="e.g. Calendly – Production" />
                </Field>
              </SectionBox>

              {code === 'calendly' && (
                <SectionBox title="Calendly Configuration" icon={Key} iconColor="text-rose-400">
                  <SecretField label="Personal Access Token (PAT)" hint="(required)" maskedValue={provider?.api_key_masked} value={apiKey} onChange={setApiKey} placeholder="eyJraWQiOiIxY…" />
                  <Field label="Booking URL" hint="(public scheduling link)">
                    <TextInput value={bookingUrl} onChange={setBookingUrl} placeholder="https://calendly.com/yourname/30min" />
                  </Field>
                  <Field label="Event Type URI" hint="(from Calendly API, optional)">
                    <TextInput value={eventTypeUri} onChange={setEventTypeUri} placeholder="https://api.calendly.com/event_types/XXXXXXXX" mono />
                  </Field>
                  <SecretField label="Webhook Signing Secret" hint="(optional — for verifying incoming webhooks)" maskedValue={provider?.webhook_signing_secret_masked} value={webhookSecret} onChange={setWebhookSecret} placeholder="Calendly webhook signing secret" />
                  <InfoBox>
                    PAT: Calendly → Profile → Integrations → API & Webhooks. Use PAT for API authentication. For webhooks, go to Integrations → Webhooks to generate the signing key.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 'google_calendar' && (
                <SectionBox title="Google Calendar OAuth" icon={Key} iconColor="text-rose-400">
                  <Field label="Calendar ID" hint="(required)">
                    <TextInput value={calendarId} onChange={setCalendarId} placeholder="primary or full-address@group.calendar.google.com" mono />
                  </Field>
                  <SecretField label="OAuth Access Token" maskedValue={provider?.oauth_access_token_masked} value={oauthAccess} onChange={setOauthAccess} placeholder="ya29.XXXXXXXX" />
                  <SecretField label="OAuth Refresh Token" hint="(required for long-lived access)" maskedValue={provider?.oauth_refresh_token_masked} value={oauthRefresh} onChange={setOauthRefresh} placeholder="1//XXXXXXXX" />
                  <Field label="Timezone">
                    <TextInput value={timezone} onChange={setTimezone} placeholder="Asia/Kolkata" mono />
                  </Field>
                  <InfoBox>
                    Complete the OAuth flow via Google Cloud Console → APIs & Services → Credentials. Enable Google Calendar API. Use offline access to get a refresh token.
                  </InfoBox>
                </SectionBox>
              )}

              {(code === 'stub') && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Stub Provider</p>
                    <p className="text-xs text-slate-600 mt-1">Booking requests are stored in the internal Supabase consultations table. No external calendar integration.</p>
                  </div>
                </div>
              )}

              <SectionBox title="Status">
                <Toggle checked={isActive} onChange={setIsActive} label="Provider active" />
                <Toggle checked={isFallback} onChange={setIsFallback} label="Use as fallback" />
              </SectionBox>

              <SectionBox title="Admin Notes">
                <TextareaInput value={notes} onChange={setNotes} placeholder="Meeting types, availability windows, escalation contacts…" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none" />
                </div>
              </SectionBox>

              {!isNew && <DeleteRow onConfirm={async () => { await schedulingProviderApi.delete(provider!.id); onDeleted(provider!.id); onClose(); }} disabled={provider?.is_primary} />}
            </div>
          )}
          {tab === 'test-logs' && <GenericTestLogList logs={logs} loading={logsLoading} />}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <SaveFooter saving={saving} isNew={isNew} onSave={handleSave} accentBg="bg-rose-700 hover:bg-rose-600" />
          </div>
        )}
      </div>
    </div>
  );
}
