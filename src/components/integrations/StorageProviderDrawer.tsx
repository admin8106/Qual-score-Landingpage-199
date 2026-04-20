import { useState, useEffect } from 'react';
import { Play, RefreshCw, Star, Settings, ClipboardList, Info, Key } from 'lucide-react';
import {
  storageProviderApi,
  type StorageProviderConfig,
  type StorageProviderSave,
  type GenericTestLog,
} from '../../api/services/genericProviders';
import { integrationAuditApi } from '../../api/services/integrationAudit';
import GenericTestLogList from './GenericTestLogList';
import {
  Field, TextInput, TextareaInput, SelectInput, SecretField,
  Toggle, SectionBox, InfoBox, SaveFooter, AlertBanner, DeleteRow,
} from './formPrimitives';

const STORAGE_CODES = ['supabase_storage', 's3', 'local', 'stub', 'custom'];
type Tab = 'config' | 'test-logs';

interface Props {
  provider: StorageProviderConfig | null;
  isNew: boolean;
  adminEmail: string;
  onClose: () => void;
  onSaved: (p: StorageProviderConfig) => void;
  onDeleted: (id: string) => void;
}

export default function StorageProviderDrawer({ provider, isNew, adminEmail, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab]               = useState<Tab>('config');
  const [code, setCode]             = useState(provider?.provider_code ?? 'supabase_storage');
  const [name, setName]             = useState(provider?.provider_name ?? '');
  const [envMode, setEnvMode]       = useState(provider?.environment_mode ?? 'SANDBOX');
  const [isActive, setIsActive]     = useState(provider?.is_active ?? false);
  const [isFallback, setIsFallback] = useState(provider?.is_fallback ?? false);
  const [displayOrder, setDisplayOrder] = useState(provider?.display_order ?? 100);
  const [notes, setNotes]           = useState(provider?.notes ?? '');

  const [bucketName, setBucketName] = useState(provider?.bucket_name ?? '');
  const [region, setRegion]         = useState(provider?.region ?? 'ap-south-1');
  const [accessKeyId, setAccessKeyId] = useState(provider?.access_key_id ?? '');
  const [secretKey, setSecretKey]   = useState('');
  const [endpointUrl, setEndpointUrl] = useState(provider?.endpoint_url ?? '');
  const [publicBaseUrl, setPublicBaseUrl] = useState(provider?.public_base_url ?? '');
  const [keyPrefix, setKeyPrefix]   = useState(provider?.key_prefix ?? '');

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
    setLogs(await storageProviderApi.getTestLogs(provider.id));
    setLogsLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) { setSaveErr('Display name is required.'); return; }
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const p: StorageProviderSave = {
        provider_code: code, provider_name: name.trim(),
        environment_mode: envMode, is_active: isActive, is_fallback: isFallback,
        display_order: displayOrder, notes: notes.trim() || undefined,
        bucket_name: bucketName.trim() || undefined,
        public_base_url: publicBaseUrl.trim() || undefined,
        key_prefix: keyPrefix.trim() || undefined,
      };
      if (code === 's3') {
        if (region.trim()) p.region = region.trim();
        if (accessKeyId.trim()) p.access_key_id = accessKeyId.trim();
        if (secretKey.trim()) p.secret_access_key_raw = secretKey.trim();
        if (endpointUrl.trim()) p.endpoint_url = endpointUrl.trim();
      }
      const saved = isNew ? await storageProviderApi.create(p) : await storageProviderApi.update(provider!.id, p);
      setSaveOk(true); setSecretKey('');
      setTimeout(() => setSaveOk(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail: adminEmail, actorRole: 'ADMIN',
        providerId: saved.id, providerName: saved.provider_name, category: 'storage',
        actionType: isNew ? 'PROVIDER_CREATED' : (secretKey.trim() ? 'CREDENTIAL_UPDATED' : 'SETTINGS_UPDATED'),
        fieldGroup: secretKey.trim() ? 'credentials' : 'config',
        changeSummary: isNew
          ? `Created storage provider "${saved.provider_name}" (${saved.provider_code}).`
          : `Updated storage provider "${saved.provider_name}" settings.`,
        environmentMode: saved.environment_mode,
      });
      onSaved(saved);
    } catch (e) { setSaveErr(e instanceof Error ? e.message : 'Save failed.'); }
    setSaving(false);
  }

  async function handleSetPrimary() {
    if (!provider) return;
    await storageProviderApi.setPrimary(provider.id, provider.environment_mode);
    const u = await storageProviderApi.get(provider.id);
    if (u) onSaved(u);
  }

  async function handleTest() {
    if (!provider) return;
    setTesting(true);
    try {
      const log = await storageProviderApi.runTest(provider.id, adminEmail);
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
            <p className="text-sm font-semibold text-white">{isNew ? 'Add Storage Provider' : (provider?.provider_name || 'Edit Storage')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{isNew ? 'Configure object storage' : `${provider?.provider_code} · ${provider?.environment_mode}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><span className="text-base leading-none">×</span></button>
        </div>

        {!isNew && provider && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0">
            <button onClick={handleTest} disabled={testing} className="inline-flex items-center gap-1.5 text-xs text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
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
              <button key={t.key} onClick={() => setTab(t.key as Tab)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-slate-400 text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
                    <SelectInput value={code} onChange={setCode} options={STORAGE_CODES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} />
                  </Field>
                  <Field label="Environment">
                    <SelectInput value={envMode} onChange={setEnvMode} options={[{ value: 'SANDBOX', label: 'Sandbox' }, { value: 'LIVE', label: 'Live' }]} />
                  </Field>
                </div>
                <Field label="Display Name">
                  <TextInput value={name} onChange={setName} placeholder="e.g. S3 Production Bucket" />
                </Field>
              </SectionBox>

              {code === 'supabase_storage' && (
                <SectionBox title="Supabase Storage" icon={Info} iconColor="text-emerald-400">
                  <Field label="Bucket Name" hint="(optional — leave blank to use project default)">
                    <TextInput value={bucketName} onChange={setBucketName} placeholder="reports" mono />
                  </Field>
                  <Field label="Public Base URL" hint="(optional — for CDN-served objects)">
                    <TextInput value={publicBaseUrl} onChange={setPublicBaseUrl} placeholder="https://yourproject.supabase.co/storage/v1/object/public" mono />
                  </Field>
                  <InfoBox color="sky">
                    Supabase Storage uses the same project credentials as your database. Create buckets in the Supabase Dashboard → Storage.
                  </InfoBox>
                </SectionBox>
              )}

              {code === 's3' && (
                <SectionBox title="AWS S3 / S3-Compatible" icon={Key} iconColor="text-slate-400">
                  <Field label="Bucket Name" hint="(required)">
                    <TextInput value={bucketName} onChange={setBucketName} placeholder="my-app-reports" mono />
                  </Field>
                  <Field label="AWS Region">
                    <TextInput value={region} onChange={setRegion} placeholder="ap-south-1" mono />
                  </Field>
                  <Field label="Access Key ID">
                    <TextInput value={accessKeyId} onChange={setAccessKeyId} placeholder="AKIAXXXXXXXXXXXXXXXX" mono />
                  </Field>
                  <SecretField label="Secret Access Key" maskedValue={provider?.secret_access_key_masked} value={secretKey} onChange={setSecretKey} placeholder="AWS secret access key" />
                  <Field label="Endpoint URL" hint="(for S3-compatible stores like MinIO, Cloudflare R2, etc.)">
                    <TextInput value={endpointUrl} onChange={setEndpointUrl} placeholder="https://s3.ap-south-1.amazonaws.com (leave blank for AWS)" mono />
                  </Field>
                </SectionBox>
              )}

              {(code === 'local' || code === 'stub') && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{code === 'local' ? 'Local Filesystem' : 'Stub Provider'}</p>
                    <p className="text-xs text-slate-600 mt-1">{code === 'local' ? 'Writes files to the server local disk. Suitable for development only — not persistent in containerised environments.' : 'No-op stub. File writes are silently dropped.'}</p>
                  </div>
                </div>
              )}

              <SectionBox title="Object Configuration">
                <Field label="Key Prefix" hint="(optional — prepended to all stored object keys)">
                  <TextInput value={keyPrefix} onChange={setKeyPrefix} placeholder="reports/v1" mono />
                </Field>
                {code !== 's3' && (
                  <Field label="Public Base URL" hint="(optional)">
                    <TextInput value={publicBaseUrl} onChange={setPublicBaseUrl} placeholder="https://cdn.example.com" mono />
                  </Field>
                )}
              </SectionBox>

              <SectionBox title="Status">
                <Toggle checked={isActive} onChange={setIsActive} label="Provider active" />
                <Toggle checked={isFallback} onChange={setIsFallback} label="Use as fallback" />
              </SectionBox>

              <SectionBox title="Admin Notes">
                <TextareaInput value={notes} onChange={setNotes} placeholder="Retention policies, IAM roles, bucket lifecycle rules…" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Display Order</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 100)} min={1} max={999} className="w-20 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none" />
                </div>
              </SectionBox>

              {!isNew && <DeleteRow onConfirm={async () => { await storageProviderApi.delete(provider!.id); onDeleted(provider!.id); onClose(); }} disabled={provider?.is_primary} />}
            </div>
          )}
          {tab === 'test-logs' && <GenericTestLogList logs={logs} loading={logsLoading} />}
        </div>

        {tab === 'config' && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
            <SaveFooter saving={saving} isNew={isNew} onSave={handleSave} accentBg="bg-slate-600 hover:bg-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}
