import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Plus, Cpu, CreditCard, MessageCircle, Mail,
  Users, BarChart2, HardDrive, Calendar, Webhook, Flag,
  CheckCircle, XCircle, AlertTriangle, Clock, Wifi, WifiOff,
  ChevronRight, Shield, Eye, EyeOff, Trash2, Play,
  Star, GitBranch, Settings, Key, ClipboardList, X, Save,
  ToggleLeft, ToggleRight, Activity, BrainCircuit, Lock, Info,
  AlertCircle, RotateCcw,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { roleLabel } from '../context/AdminPermissions';
import { ROUTES } from '../constants/routes';
import AIManagementPanel from '../components/integrations/AIManagementPanel';
import PaymentManagementPanel from '../components/payment/PaymentManagementPanel';
import WhatsAppManagementPanel from '../components/comms/WhatsAppManagementPanel';
import EmailManagementPanel from '../components/comms/EmailManagementPanel';
import CrmManagementPanel from '../components/integrations/CrmManagementPanel';
import AnalyticsManagementPanel from '../components/integrations/AnalyticsManagementPanel';
import StorageManagementPanel from '../components/integrations/StorageManagementPanel';
import SchedulingManagementPanel from '../components/integrations/SchedulingManagementPanel';
import ConfirmModal from '../components/common/ConfirmModal';
import { env } from '../config/env';
import {
  integrationApi,
  type IntegrationProviderResponse,
  type IntegrationProviderListResponse,
  type IntegrationTestLogResponse,
  type IntegrationAuditLogResponse,
} from '../api/services/integrations';
import {
  integrationAuditApi,
  type IntegrationAuditEntry,
} from '../api/services/integrationAudit';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  LLM:          { label: 'LLM / AI',       icon: Cpu,            color: 'text-sky-400',     bg: 'bg-sky-500/10' },
  PAYMENT:      { label: 'Payment',         icon: CreditCard,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  WHATSAPP:     { label: 'WhatsApp',        icon: MessageCircle,  color: 'text-green-400',   bg: 'bg-green-500/10' },
  EMAIL:        { label: 'Email',           icon: Mail,           color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  CRM:          { label: 'CRM',             icon: Users,          color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  ANALYTICS:    { label: 'Analytics',       icon: BarChart2,      color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  STORAGE:      { label: 'Storage',         icon: HardDrive,      color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  SCHEDULING:   { label: 'Scheduling',      icon: Calendar,       color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  WEBHOOK:      { label: 'Webhook',         icon: Webhook,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  FEATURE_FLAG: { label: 'Feature Flags',   icon: Flag,           color: 'text-teal-400',    bg: 'bg-teal-500/10' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

// ─── Status helpers ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:   'bg-emerald-400',
    INACTIVE: 'bg-slate-600',
    TESTING:  'bg-amber-400 animate-pulse',
    FAILED:   'bg-red-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? 'bg-slate-600'}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-500 border-white/[0.06]',
    TESTING:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    FAILED:   'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? map.INACTIVE}`}>
      <StatusDot status={status} />
      {status}
    </span>
  );
}

function EnvBadge({ mode }: { mode: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
      mode === 'LIVE'
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : 'bg-slate-500/10 text-slate-500 border-white/[0.06]'
    }`}>
      {mode}
    </span>
  );
}

function TestStatusIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'FAILURE') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'TIMEOUT') return <Clock className="w-3.5 h-3.5 text-amber-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />;
}

// ─── Live Mode Warning Banner ─────────────────────────────────────────────────

function LiveModeWarning({ providerName }: { providerName: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-red-400">Live Mode — Real Transactions</p>
        <p className="text-xs text-red-400/70 mt-0.5">
          {providerName} is in LIVE mode. Changes here affect real production traffic. Double-check all values before saving.
        </p>
      </div>
    </div>
  );
}

// ─── Permission lock indicator ────────────────────────────────────────────────

function ReadOnlyBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-center gap-2 bg-slate-500/8 border border-white/[0.06] rounded-xl px-3 py-2 mb-4">
      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <p className="text-xs text-slate-500">{reason}</p>
    </div>
  );
}

// ─── Masked value display ─────────────────────────────────────────────────────

function MaskedValue({ masked }: { masked: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-slate-400">{revealed ? masked : '••••••••'}</span>
      <button
        onClick={() => setRevealed((r) => !r)}
        className="text-slate-600 hover:text-slate-400 transition-colors"
        title={revealed
          ? 'Hide — this is a partial preview only, not the real secret'
          : 'Preview stored value (partial hash — real secret is not accessible from the UI)'}
      >
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
      {revealed && (
        <span className="text-xs text-slate-700 italic">(preview only)</span>
      )}
    </span>
  );
}

// ─── Field helper text ────────────────────────────────────────────────────────

function FieldHint({ text }: { text: string }) {
  return <p className="text-xs text-slate-700 mt-1">{text}</p>;
}

// ─── Action color map ─────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREDENTIAL_UPDATED:          'text-amber-400',
  CREDENTIAL_ROTATE_CONFIRMED: 'text-red-400',
  SETTINGS_UPDATED:            'text-blue-400',
  PROVIDER_ENABLED:            'text-emerald-400',
  PROVIDER_DISABLED:           'text-slate-500',
  SET_PRIMARY:                 'text-amber-300',
  SET_FALLBACK:                'text-sky-400',
  UNSET_FALLBACK:              'text-slate-500',
  RUN_TEST:                    'text-sky-400',
  PROVIDER_CREATED:            'text-emerald-400',
  PROVIDER_DELETED:            'text-red-400',
  ENV_MODE_CHANGED:            'text-orange-400',
  CACHE_REFRESH:               'text-orange-400',
};

function SupabaseAuditRow({ log }: { log: IntegrationAuditEntry }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-mono font-semibold ${ACTION_COLORS[log.action_type] ?? 'text-slate-400'}`}>
          {log.action_type}
        </span>
        <span className="text-xs text-slate-700">{new Date(log.created_at).toLocaleString('en-IN')}</span>
      </div>
      <p className="text-xs text-slate-300 mt-0.5">{log.change_summary}</p>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-xs text-slate-600">{log.actor_email}</span>
        {log.actor_role && (
          <span className="text-xs text-slate-700 bg-white/[0.03] border border-white/[0.05] rounded px-1.5 py-0.5">
            {roleLabel(log.actor_role)}
          </span>
        )}
        {log.field_group && log.field_group !== 'general' && (
          <span className="text-xs text-slate-700 font-mono">{log.field_group}</span>
        )}
        {log.environment_mode === 'LIVE' && (
          <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">LIVE</span>
        )}
      </div>
    </div>
  );
}

// ─── Create Provider Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: (p: IntegrationProviderResponse) => void;
  token: string;
  actorEmail: string;
  actorRole: string;
}

function CreateProviderModal({ onClose, onCreated, token, actorEmail, actorRole }: CreateModalProps) {
  const [category, setCategory] = useState('LLM');
  const [providerCode, setProviderCode] = useState('');
  const [providerName, setProviderName] = useState('');
  const [envMode, setEnvMode] = useState('SANDBOX');
  const [displayOrder, setDisplayOrder] = useState('100');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  async function doCreate() {
    setSaving(true);
    setError('');
    const result = await integrationApi.create(token, {
      category,
      providerCode: providerCode.toLowerCase().trim(),
      providerName: providerName.trim(),
      environmentMode: envMode,
      displayOrder: parseInt(displayOrder, 10) || 100,
    });
    setSaving(false);
    if (result.ok) {
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: result.data.id,
        providerName: result.data.providerName,
        category: result.data.category,
        actionType: 'PROVIDER_CREATED',
        fieldGroup: 'general',
        changeSummary: `Created provider "${result.data.providerName}" (${result.data.providerCode}) in ${envMode} mode.`,
        environmentMode: envMode,
      });
      onCreated(result.data);
    } else {
      setError(result.error.message || 'Failed to create provider.');
    }
  }

  function handleSave() {
    if (!providerCode.trim() || !providerName.trim()) {
      setError('Provider code and name are required.');
      return;
    }
    if (envMode === 'LIVE') {
      setShowLiveConfirm(true);
      return;
    }
    doCreate();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#0D1120] border border-white/[0.10] rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-semibold text-white">Add Integration Provider</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
            )}
            <div className="flex items-start gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
              <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                Create a provider entry first, then add credentials in the Credentials tab. Start in Sandbox mode and switch to Live only after testing.
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors"
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0D1120]">{CATEGORY_META[c]?.label ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">
                Provider Code <span className="text-slate-700">(lowercase, no spaces — cannot be changed later)</span>
              </label>
              <input
                value={providerCode}
                onChange={(e) => setProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="openai"
                className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Display Name</label>
              <input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="OpenAI GPT-4o"
                className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Environment</label>
                <select
                  value={envMode}
                  onChange={(e) => setEnvMode(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors"
                >
                  <option value="SANDBOX" className="bg-[#0D1120]">Sandbox (recommended)</option>
                  <option value="LIVE" className="bg-[#0D1120]">Live</option>
                </select>
                {envMode === 'LIVE' && (
                  <p className="text-xs text-red-400 mt-1">Live mode creates real transactions</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Display Order</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  min="1" max="999"
                  className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-white/[0.07]">
            <button onClick={onClose} className="flex-1 text-sm text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2.5 transition-colors font-medium"
            >
              {saving ? 'Creating…' : 'Create Provider'}
            </button>
          </div>
        </div>
      </div>
      {showLiveConfirm && (
        <ConfirmModal
          title="Creating Live Mode Provider"
          message={`You are about to create "${providerName}" in LIVE mode. This provider will handle real production traffic once activated. Are you sure?`}
          confirmLabel="Yes, create in Live mode"
          danger
          onConfirm={() => { setShowLiveConfirm(false); doCreate(); }}
          onCancel={() => setShowLiveConfirm(false)}
          loading={saving}
        />
      )}
    </>
  );
}

// ─── Credentials Panel ────────────────────────────────────────────────────────

interface CredPanelProps {
  provider: IntegrationProviderResponse;
  token: string;
  onUpdated: (p: IntegrationProviderResponse) => void;
  canEdit: boolean;
  canRotate: boolean;
  actorEmail: string;
  actorRole: string;
}

interface CredEntry {
  keyName: string;
  newValue: string;
  isSecret: boolean;
  isReplacing: boolean;
}

function CredentialsPanel({ provider, token, onUpdated, canEdit, canRotate, actorEmail, actorRole }: CredPanelProps) {
  const [entries, setEntries] = useState<CredEntry[]>(
    provider.credentials.map((c) => ({ keyName: c.keyName, newValue: '', isSecret: c.isSecret, isReplacing: false }))
  );
  const [newRows, setNewRows] = useState<Array<{ keyName: string; value: string; isSecret: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  const isLive = provider.environmentMode === 'LIVE';

  function addNewRow() {
    setNewRows((r) => [...r, { keyName: '', value: '', isSecret: true }]);
  }

  function removeNewRow(i: number) {
    setNewRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function doSave() {
    const toSend: Array<{ keyName: string; value: string; isSecret?: boolean }> = [];
    for (const e of entries) {
      if (e.isReplacing && e.newValue.trim()) {
        toSend.push({ keyName: e.keyName, value: e.newValue.trim(), isSecret: e.isSecret });
      }
    }
    for (const r of newRows) {
      if (r.keyName.trim() && r.value.trim()) {
        toSend.push({ keyName: r.keyName.trim(), value: r.value.trim(), isSecret: r.isSecret });
      }
    }

    if (toSend.length === 0) {
      setError('No new or updated credentials to save. Use "Replace" to update an existing secret, or add a new key below.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    const result = await integrationApi.upsertCredentials(token, provider.id, { credentials: toSend });
    setSaving(false);
    if (result.ok) {
      setSuccess(true);
      onUpdated(result.data);
      setTimeout(() => setSuccess(false), 3000);
      const rotated = entries.filter((e) => e.isReplacing && e.newValue.trim());
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: rotated.length > 0 ? 'CREDENTIAL_ROTATE_CONFIRMED' : 'CREDENTIAL_UPDATED',
        fieldGroup: 'credentials',
        changeSummary: `Updated credentials: ${toSend.map((c) => c.keyName).join(', ')}. Values masked.`,
        environmentMode: provider.environmentMode,
      });
      setEntries(result.data.credentials.map((c) => ({ keyName: c.keyName, newValue: '', isSecret: c.isSecret, isReplacing: false })));
      setNewRows([]);
      setPendingSave(false);
    } else {
      setError(result.error.message || 'Failed to save credentials.');
    }
  }

  function handleSave() {
    const hasRotation = entries.some((e) => e.isReplacing && e.newValue.trim());
    if (isLive && hasRotation) {
      if (!canRotate) {
        setError('You do not have permission to rotate credentials in Live mode. Contact a Super Admin.');
        return;
      }
      setPendingSave(true);
      setShowRotateConfirm(true);
    } else if (!canEdit) {
      setError('You do not have edit permission.');
    } else {
      doSave();
    }
  }

  return (
    <>
      {!canEdit && <ReadOnlyBanner reason="You have view-only access. Contact a Super Admin to update credentials." />}
      {isLive && <LiveModeWarning providerName={provider.providerName} />}
      {canEdit && !canRotate && (
        <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/15 rounded-xl px-3 py-2.5 mb-4">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400/80">
            Your role can add new credentials but cannot rotate (replace) existing secrets. Contact a Super Admin to rotate.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {provider.credentials.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Stored Keys</p>
              <div className="flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 rounded px-1.5 py-0.5">
                <Shield className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">AES-256-GCM encrypted</span>
              </div>
            </div>
            {provider.credentials.map((c, idx) => {
              const entry = entries[idx];
              return (
                <div key={c.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.isSecret && <Lock className="w-3 h-3 text-amber-400/60 shrink-0" />}
                      <span className="text-xs text-slate-400 font-mono truncate">{c.keyName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <MaskedValue masked={c.maskedValue} />
                      {canRotate && canEdit && (
                        <button
                          onClick={() => setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, isReplacing: !e.isReplacing, newValue: '' } : e))}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                            entry?.isReplacing
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-slate-500 bg-white/[0.03] border-white/[0.07] hover:text-slate-300'
                          }`}
                          title="Replace this secret — old value will be permanently overwritten"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {entry?.isReplacing ? 'Cancel' : 'Replace'}
                        </button>
                      )}
                    </div>
                  </div>
                  {entry?.isReplacing && (
                    <div className="border-t border-amber-500/15 px-3 py-2.5 bg-amber-500/5">
                      <p className="text-xs text-amber-400/80 mb-1.5">
                        Enter the new value. The existing secret will be permanently overwritten and cannot be recovered.
                      </p>
                      <input
                        type="password"
                        value={entry.newValue}
                        onChange={(e) => setEntries((prev) => prev.map((r, i) => i === idx ? { ...r, newValue: e.target.value } : r))}
                        placeholder="New secret value…"
                        className="w-full bg-white/[0.04] border border-amber-500/25 text-slate-300 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500/50 transition-colors placeholder-slate-700"
                      />
                    </div>
                  )}
                  <div className="px-3 pb-1.5">
                    <p className="text-xs text-slate-700">Last updated: {new Date(c.updatedAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canEdit && (
          <>
            {newRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">New Credentials</p>
                {newRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                    <input
                      value={row.keyName}
                      onChange={(e) => setNewRows((r) => r.map((x, idx) => idx === i ? { ...x, keyName: e.target.value } : x))}
                      placeholder="KEY_NAME"
                      className="bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
                    />
                    <input
                      type={row.isSecret ? 'password' : 'text'}
                      value={row.value}
                      onChange={(e) => setNewRows((r) => r.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                      placeholder="value"
                      className="bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
                    />
                    <button
                      onClick={() => setNewRows((r) => r.map((x, idx) => idx === i ? { ...x, isSecret: !x.isSecret } : x))}
                      className={`text-xs px-2 py-2 rounded-lg border transition-colors ${row.isSecret ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-slate-500 border-white/[0.08] bg-white/[0.04]'}`}
                      title={row.isSecret ? 'Encrypted at rest' : 'Plain text (not encrypted)'}
                    >
                      <Shield className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeNewRow(i)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
            )}
            {success && (
              <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> Credentials saved. Masked values updated.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={addNewRow}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add new key
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-1.5 transition-colors font-medium"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving…' : 'Save Credentials'}
              </button>
            </div>
          </>
        )}
      </div>

      {showRotateConfirm && (
        <ConfirmModal
          title="Rotate Live Credentials"
          message={`You are about to replace one or more secrets for "${provider.providerName}" which is running in LIVE mode. The old secrets will be permanently overwritten. Make sure your provider dashboard is also updated if needed.`}
          confirmLabel="Yes, rotate credentials"
          danger
          onConfirm={() => { setShowRotateConfirm(false); if (pendingSave) doSave(); }}
          onCancel={() => { setShowRotateConfirm(false); setPendingSave(false); }}
          loading={saving}
        />
      )}
    </>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

interface SettingsPanelProps {
  provider: IntegrationProviderResponse;
  token: string;
  onUpdated: (p: IntegrationProviderResponse) => void;
  canEdit: boolean;
  actorEmail: string;
  actorRole: string;
}

function SettingsPanel({ provider, token, onUpdated, canEdit, actorEmail, actorRole }: SettingsPanelProps) {
  const [entries, setEntries] = useState<Array<{ settingKey: string; settingValue: string }>>(
    provider.settings.map((s) => ({ settingKey: s.settingKey, settingValue: s.settingValue }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isLive = provider.environmentMode === 'LIVE';

  function addRow() {
    setEntries((e) => [...e, { settingKey: '', settingValue: '' }]);
  }

  function removeRow(i: number) {
    setEntries((e) => e.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const valid = entries.filter((e) => e.settingKey.trim());
    if (valid.length === 0) {
      setError('At least one setting key is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    const result = await integrationApi.upsertSettings(token, provider.id, { settings: valid });
    setSaving(false);
    if (result.ok) {
      setSuccess(true);
      onUpdated(result.data);
      setTimeout(() => setSuccess(false), 3000);
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: 'SETTINGS_UPDATED',
        fieldGroup: 'settings',
        changeSummary: `Updated settings: ${valid.map((s) => s.settingKey).join(', ')}.`,
        environmentMode: provider.environmentMode,
      });
      setEntries(result.data.settings.map((s) => ({ settingKey: s.settingKey, settingValue: s.settingValue })));
    } else {
      setError(result.error.message || 'Failed to save settings.');
    }
  }

  return (
    <div className="space-y-3">
      {!canEdit && <ReadOnlyBanner reason="You have view-only access and cannot modify settings." />}
      {isLive && canEdit && <LiveModeWarning providerName={provider.providerName} />}

      <div className="flex items-start gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          Settings are plaintext key-value pairs (not encrypted). Do not store secrets here — use the Credentials tab for API keys and tokens.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Settings saved.
        </div>
      )}

      {entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <input
            value={entry.settingKey}
            onChange={(e) => setEntries((prev) => prev.map((r, idx) => idx === i ? { ...r, settingKey: e.target.value } : r))}
            placeholder="setting_key"
            disabled={!canEdit}
            className="w-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 disabled:opacity-50"
          />
          <input
            value={entry.settingValue}
            onChange={(e) => setEntries((prev) => prev.map((r, idx) => idx === i ? { ...r, settingValue: e.target.value } : r))}
            placeholder="value"
            disabled={!canEdit}
            className="w-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 disabled:opacity-50"
          />
          {canEdit && (
            <button onClick={() => removeRow(i)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5 mt-1">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <div className="flex gap-2 pt-1">
          <button onClick={addRow} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors">
            <Plus className="w-3 h-3" /> Add setting
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-1.5 transition-colors font-medium"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Provider Detail Drawer ───────────────────────────────────────────────────

type DrawerTab = 'overview' | 'credentials' | 'settings' | 'test-logs' | 'audit';

interface DrawerProps {
  provider: IntegrationProviderResponse;
  token: string;
  onClose: () => void;
  onUpdated: (p: IntegrationProviderResponse) => void;
  onDelete: (id: string) => void;
  actorEmail: string;
  actorRole: string;
  canEdit: boolean;
  canRotate: boolean;
  canTest: boolean;
  canDelete: boolean;
  canSetPrimary: boolean;
  canEnableDisable: boolean;
}

function ProviderDrawer({
  provider: initialProvider, token, onClose, onUpdated, onDelete,
  actorEmail, actorRole, canEdit, canRotate, canTest, canDelete, canSetPrimary, canEnableDisable,
}: DrawerProps) {
  const [provider, setProvider] = useState(initialProvider);
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [testLogs, setTestLogs] = useState<IntegrationTestLogResponse[]>([]);
  const [backendAuditLogs, setBackendAuditLogs] = useState<IntegrationAuditLogResponse[]>([]);
  const [supabaseAuditLogs, setSupabaseAuditLogs] = useState<IntegrationAuditEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showPrimaryConfirm, setShowPrimaryConfirm] = useState(false);

  const isLive = provider.environmentMode === 'LIVE';
  const hasCredentials = provider.credentials.length > 0;

  function handleUpdated(updated: IntegrationProviderResponse) {
    setProvider(updated);
    onUpdated(updated);
  }

  async function loadLogs(t: DrawerTab) {
    if (t === 'test-logs') {
      setLoadingLogs(true);
      const r = await integrationApi.getTestLogs(token, provider.id);
      if (r.ok) setTestLogs(r.data);
      setLoadingLogs(false);
    } else if (t === 'audit') {
      setLoadingLogs(true);
      const [backendRes, supabaseRes] = await Promise.all([
        integrationApi.getProviderAuditLogs(token, provider.id),
        integrationAuditApi.getProviderLogs(provider.id),
      ]);
      if (backendRes.ok) setBackendAuditLogs(backendRes.data);
      setSupabaseAuditLogs(supabaseRes);
      setLoadingLogs(false);
    }
  }

  function switchTab(t: DrawerTab) {
    setTab(t);
    loadLogs(t);
  }

  async function doToggle() {
    setActionLoading('toggle');
    const result = provider.status === 'ACTIVE'
      ? await integrationApi.disable(token, provider.id)
      : await integrationApi.enable(token, provider.id);
    if (result.ok) {
      handleUpdated(result.data);
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: provider.status === 'ACTIVE' ? 'PROVIDER_DISABLED' : 'PROVIDER_ENABLED',
        fieldGroup: 'status',
        changeSummary: `Provider "${provider.providerName}" ${provider.status === 'ACTIVE' ? 'disabled' : 'enabled'} by ${actorEmail}.`,
        environmentMode: provider.environmentMode,
      });
    }
    setActionLoading('');
    setShowToggleConfirm(false);
  }

  function handleToggle() {
    if (provider.status === 'ACTIVE' && isLive) {
      setShowToggleConfirm(true);
    } else {
      doToggle();
    }
  }

  async function doSetPrimary() {
    setActionLoading('primary');
    const result = await integrationApi.setPrimary(token, provider.id);
    if (result.ok) {
      handleUpdated(result.data);
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: 'SET_PRIMARY',
        fieldGroup: 'primary',
        changeSummary: `"${provider.providerName}" set as primary for ${provider.category} by ${actorEmail}.`,
        environmentMode: provider.environmentMode,
      });
    }
    setActionLoading('');
    setShowPrimaryConfirm(false);
  }

  function handleSetPrimary() {
    if (isLive) {
      setShowPrimaryConfirm(true);
    } else {
      doSetPrimary();
    }
  }

  async function handleSetFallback() {
    setActionLoading('fallback');
    const enable = !provider.isFallback;
    const result = await integrationApi.setFallback(token, provider.id, enable);
    if (result.ok) {
      handleUpdated(result.data);
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: enable ? 'SET_FALLBACK' : 'UNSET_FALLBACK',
        fieldGroup: 'fallback',
        changeSummary: `"${provider.providerName}" ${enable ? 'set as' : 'removed from'} fallback by ${actorEmail}.`,
        environmentMode: provider.environmentMode,
      });
    }
    setActionLoading('');
  }

  async function handleRunTest() {
    if (!hasCredentials) return;
    setRunningTest(true);
    const result = await integrationApi.runTest(token, provider.id, 'CONNECTIVITY');
    setRunningTest(false);
    if (result.ok) {
      setTestLogs((prev) => [result.data, ...prev]);
      const refreshed = await integrationApi.getById(token, provider.id);
      if (refreshed.ok) handleUpdated(refreshed.data);
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: 'RUN_TEST',
        fieldGroup: 'test',
        changeSummary: `Connectivity test run by ${actorEmail}. Result: ${result.data.status}.`,
        environmentMode: provider.environmentMode,
      });
      if (tab !== 'test-logs') switchTab('test-logs');
    }
  }

  async function handleDelete() {
    const result = await integrationApi.delete(token, provider.id);
    if (result.ok) {
      await integrationAuditApi.logAction({
        actorEmail, actorRole,
        providerId: provider.id, providerName: provider.providerName, category: provider.category,
        actionType: 'PROVIDER_DELETED',
        fieldGroup: 'general',
        changeSummary: `Provider "${provider.providerName}" permanently deleted by ${actorEmail}.`,
        environmentMode: provider.environmentMode,
      });
      onDelete(provider.id);
      onClose();
    }
    setShowDeleteConfirm(false);
  }

  const catMeta = CATEGORY_META[provider.category];
  const CatIcon = catMeta?.icon ?? Settings;

  const TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview',    label: 'Overview',    icon: Activity },
    { key: 'credentials', label: 'Credentials', icon: Key },
    { key: 'settings',    label: 'Settings',    icon: Settings },
    { key: 'test-logs',   label: 'Test Logs',   icon: Wifi },
    { key: 'audit',       label: 'Audit',       icon: ClipboardList },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 flex" onClick={onClose}>
        <div className="flex-1 bg-black/40" />
        <div
          className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${catMeta?.bg ?? 'bg-slate-500/10'} flex items-center justify-center`}>
                <CatIcon className={`w-4.5 h-4.5 ${catMeta?.color ?? 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{provider.providerName}</p>
                <p className="text-xs text-slate-500 font-mono">{provider.providerCode} · {catMeta?.label ?? provider.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={provider.status} />
              <EnvBadge mode={provider.environmentMode} />
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Incomplete live warning */}
          {isLive && !hasCredentials && (
            <div className="flex items-center gap-2 px-6 py-2 bg-amber-500/8 border-b border-amber-500/15 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">
                This provider is in Live mode but has no credentials. Add credentials before activating.
              </p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            {canEnableDisable && (
              <button
                onClick={handleToggle}
                disabled={actionLoading === 'toggle'}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                  provider.status === 'ACTIVE'
                    ? 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                } disabled:opacity-50`}
              >
                {provider.status === 'ACTIVE'
                  ? <><ToggleRight className="w-3.5 h-3.5" /> Disable</>
                  : <><ToggleLeft className="w-3.5 h-3.5" /> Enable</>
                }
              </button>
            )}

            {canSetPrimary && (
              <button
                onClick={handleSetPrimary}
                disabled={actionLoading === 'primary' || provider.isPrimary || provider.status !== 'ACTIVE'}
                title={
                  provider.status !== 'ACTIVE' ? 'Enable this provider first' :
                  provider.isPrimary ? 'Already the primary provider' : 'Make this the primary provider'
                }
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                  provider.isPrimary
                    ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                } disabled:opacity-40`}
              >
                <Star className={`w-3 h-3 ${provider.isPrimary ? 'fill-amber-400' : ''}`} />
                {provider.isPrimary ? 'Primary' : 'Set Primary'}
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleSetFallback}
                disabled={actionLoading === 'fallback'}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                  provider.isFallback
                    ? 'text-sky-400 border-sky-500/20 bg-sky-500/10'
                    : 'text-slate-400 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                } disabled:opacity-50`}
              >
                <GitBranch className="w-3 h-3" />
                {provider.isFallback ? 'Fallback On' : 'Set Fallback'}
              </button>
            )}

            {canTest && (
              <button
                onClick={handleRunTest}
                disabled={runningTest || !hasCredentials}
                title={!hasCredentials ? 'Add credentials before running a test' : 'Run a connectivity test'}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {runningTest
                  ? <><RefreshCw className="w-3 h-3 animate-spin" /> Testing…</>
                  : <><Play className="w-3 h-3" /> Run Test</>
                }
              </button>
            )}
            <div className="flex-1" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.05] shrink-0 overflow-x-auto">
            {TABS.map((t) => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => switchTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <TIcon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'overview' && (
              <div className="space-y-5">
                {isLive && (
                  <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400/80">
                      This provider is in <strong>LIVE mode</strong>. All changes affect real production traffic.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Category', value: catMeta?.label ?? provider.category },
                    { label: 'Provider Code', value: provider.providerCode, mono: true },
                    { label: 'Environment', value: provider.environmentMode },
                    { label: 'Display Order', value: String(provider.displayOrder) },
                    { label: 'Created', value: new Date(provider.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { label: 'Updated', value: new Date(provider.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                      <p className="text-xs text-slate-600 mb-1">{item.label}</p>
                      <p className={`text-sm text-slate-300 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {!hasCredentials && (
                  <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-400">No credentials configured</p>
                      <p className="text-xs text-amber-400/70 mt-0.5">
                        Go to the Credentials tab to add API keys or tokens. Without credentials this provider cannot be tested or activated.
                      </p>
                    </div>
                  </div>
                )}

                {provider.latestTest && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-3">Last Test Result</p>
                    <div className="flex items-start gap-3">
                      <TestStatusIcon status={provider.latestTest.status} />
                      <div>
                        <p className="text-xs text-slate-300">{provider.latestTest.responseSummary || 'No summary available.'}</p>
                        <p className="text-xs text-slate-600 mt-1">{new Date(provider.latestTest.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {canDelete && (
                  <div className="pt-2 border-t border-white/[0.05]">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={provider.isPrimary}
                      title={provider.isPrimary ? 'Cannot delete a primary provider — set another as primary first' : ''}
                      className="inline-flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete provider
                    </button>
                    {provider.isPrimary && (
                      <p className="text-xs text-slate-700 mt-1">Set another provider as primary before deleting this one.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'credentials' && (
              <CredentialsPanel
                provider={provider} token={token} onUpdated={handleUpdated}
                canEdit={canEdit} canRotate={canRotate}
                actorEmail={actorEmail} actorRole={actorRole}
              />
            )}

            {tab === 'settings' && (
              <SettingsPanel
                provider={provider} token={token} onUpdated={handleUpdated}
                canEdit={canEdit} actorEmail={actorEmail} actorRole={actorRole}
              />
            )}

            {tab === 'test-logs' && (
              <div className="space-y-2">
                {loadingLogs ? (
                  <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
                ) : testLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-600">
                    <Wifi className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No test runs yet.</p>
                    {canTest && hasCredentials && (
                      <button
                        onClick={handleRunTest}
                        disabled={runningTest}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Run first test
                      </button>
                    )}
                  </div>
                ) : testLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                    <TestStatusIcon status={log.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-300">{log.testType}</span>
                        <span className={`text-xs ${log.status === 'SUCCESS' ? 'text-emerald-400' : log.status === 'FAILURE' ? 'text-red-400' : 'text-amber-400'}`}>{log.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{log.responseSummary}</p>
                      <p className="text-xs text-slate-700 mt-0.5">{new Date(log.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'audit' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Dashboard Actions</p>
                  {loadingLogs ? (
                    <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
                  ) : supabaseAuditLogs.length === 0 ? (
                    <div className="text-center py-6 text-slate-600">
                      <ClipboardList className="w-6 h-6 mx-auto mb-1 opacity-30" />
                      <p className="text-xs">No dashboard audit entries yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supabaseAuditLogs.map((log) => <SupabaseAuditRow key={log.id} log={log} />)}
                    </div>
                  )}
                </div>

                {backendAuditLogs.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Backend System Events</p>
                    <div className="space-y-2">
                      {backendAuditLogs.map((log) => (
                        <div key={log.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-mono font-medium text-blue-400">{log.actionType}</span>
                            <span className="text-xs text-slate-700">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{log.actorEmail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Provider"
          message={`Permanently delete "${provider.providerName}"? All credentials and settings will be removed. This cannot be undone.`}
          confirmLabel="Delete permanently"
          danger
          requireTyping={provider.providerCode}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showToggleConfirm && (
        <ConfirmModal
          title="Disable Live Provider"
          message={`Disabling "${provider.providerName}" (Live mode) will immediately stop routing live traffic to this provider.`}
          confirmLabel="Yes, disable"
          danger
          onConfirm={doToggle}
          onCancel={() => setShowToggleConfirm(false)}
          loading={actionLoading === 'toggle'}
        />
      )}

      {showPrimaryConfirm && (
        <ConfirmModal
          title="Set as Primary (Live Mode)"
          message={`Setting "${provider.providerName}" as primary in LIVE mode will immediately route all new traffic through this provider. Ensure it is fully configured and tested.`}
          confirmLabel="Set as primary"
          onConfirm={doSetPrimary}
          onCancel={() => setShowPrimaryConfirm(false)}
          loading={actionLoading === 'primary'}
        />
      )}
    </>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({ provider, onClick }: { provider: IntegrationProviderResponse; onClick: () => void }) {
  const catMeta = CATEGORY_META[provider.category];
  const CatIcon = catMeta?.icon ?? Settings;
  const isLive = provider.environmentMode === 'LIVE';
  const noCredentials = provider.credentials.length === 0;

  return (
    <div
      onClick={onClick}
      className={`group bg-white/[0.02] hover:bg-white/[0.04] border rounded-2xl p-4 cursor-pointer transition-all duration-150 ${
        isLive && provider.status === 'ACTIVE'
          ? 'border-red-500/15 hover:border-red-500/25'
          : 'border-white/[0.07] hover:border-white/[0.12]'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${catMeta?.bg ?? 'bg-slate-500/10'} flex items-center justify-center shrink-0`}>
            <CatIcon className={`w-4 h-4 ${catMeta?.color ?? 'text-slate-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{provider.providerName}</p>
            <p className="text-xs text-slate-600 font-mono truncate">{provider.providerCode}</p>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={provider.status} />
        <EnvBadge mode={provider.environmentMode} />
        {provider.isPrimary && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> Primary
          </span>
        )}
        {provider.isFallback && (
          <span className="inline-flex items-center gap-1 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">
            <GitBranch className="w-2.5 h-2.5" /> Fallback
          </span>
        )}
      </div>

      {noCredentials && (
        <div className="flex items-center gap-1 mt-2">
          <AlertCircle className="w-3 h-3 text-amber-400/60" />
          <span className="text-xs text-amber-400/60">No credentials</span>
        </div>
      )}

      {provider.latestTest && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
          <TestStatusIcon status={provider.latestTest.status} />
          <span className="text-xs text-slate-600 truncate">{provider.latestTest.responseSummary || provider.latestTest.status}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs text-slate-700">
        <span>{provider.credentials.length} credential{provider.credentials.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{provider.settings.length} setting{provider.settings.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category, providers, onSelect,
}: {
  category: string;
  providers: IntegrationProviderResponse[];
  onSelect: (p: IntegrationProviderResponse) => void;
}) {
  const meta = CATEGORY_META[category];
  const CatIcon = meta?.icon ?? Settings;
  const liveActive = providers.filter((p) => p.environmentMode === 'LIVE' && p.status === 'ACTIVE').length;
  const primaryCount = providers.filter((p) => p.isPrimary).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`w-6 h-6 rounded-lg ${meta?.bg ?? 'bg-slate-500/10'} flex items-center justify-center`}>
          <CatIcon className={`w-3 h-3 ${meta?.color ?? 'text-slate-400'}`} />
        </div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{meta?.label ?? category}</h3>
        <span className="text-xs text-slate-700 bg-white/[0.04] rounded-full px-2 py-0.5">{providers.length}</span>
        {liveActive > 0 && (
          <span className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-full px-2 py-0.5">
            {liveActive} LIVE
          </span>
        )}
        {primaryCount > 1 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> {primaryCount} primaries — conflict
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} onClick={() => onSelect(p)} />
        ))}
      </div>
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ data }: { data: IntegrationProviderListResponse }) {
  const all = Object.values(data.byCategory).flat();
  const active = all.filter((p) => p.status === 'ACTIVE').length;
  const failed = all.filter((p) => p.status === 'FAILED').length;
  const testing = all.filter((p) => p.status === 'TESTING').length;
  const categories = Object.keys(data.byCategory).length;
  const liveActive = all.filter((p) => p.environmentMode === 'LIVE' && p.status === 'ACTIVE').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
      {[
        { label: 'Total Providers', value: data.total,       color: 'text-slate-300',   Icon: Settings },
        { label: 'Active',          value: active,           color: 'text-emerald-400', Icon: CheckCircle },
        { label: 'Categories',      value: categories,       color: 'text-blue-400',    Icon: BarChart2 },
        { label: 'Live Active',     value: liveActive,       color: liveActive > 0 ? 'text-red-400' : 'text-slate-600', Icon: AlertTriangle },
        { label: 'Failed',          value: failed + testing, color: (failed + testing) > 0 ? 'text-red-400' : 'text-slate-600', Icon: (failed > 0 ? WifiOff : Wifi) },
      ].map((item) => (
        <div key={item.label} className="bg-white/[0.02] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
          <item.Icon className={`w-4 h-4 ${item.color} shrink-0`} />
          <div>
            <p className={`text-xl font-bold leading-none ${item.color}`}>{item.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageView = 'integrations' | 'ai' | 'payments' | 'whatsapp' | 'email' | 'crm' | 'analytics' | 'storage' | 'scheduling';

export default function IntegrationControlCenterPage() {
  const navigate = useNavigate();
  const { token, logout, profile, permissions } = useAdminAuth();

  const [view, setView] = useState<PageView>('integrations');
  const [data, setData] = useState<IntegrationProviderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProviderResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [allAuditLogs, setAllAuditLogs] = useState<IntegrationAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [cacheRefreshedAt, setCacheRefreshedAt] = useState<Date | null>(null);

  const adminEmail = profile?.email ?? 'admin';
  const adminRole = profile?.role ?? 'VIEWER';

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const result = await integrationApi.listAll(token);
    setLoading(false);
    if (!result.ok) {
      if (result.error.code === 'UNAUTHORIZED' || result.error.code === 'FORBIDDEN') {
        logout();
        navigate(ROUTES.ADMIN_LOGIN, { replace: true });
        return;
      }
      setError(result.error.message || 'Failed to load integration providers.');
      return;
    }
    setData(result.data);
  }, [token, logout, navigate]);

  useEffect(() => { load(); }, [load]);

  async function loadAllAudit() {
    setLoadingAudit(true);
    const logs = await integrationAuditApi.getAllLogs(200);
    setAllAuditLogs(logs);
    setLoadingAudit(false);
  }

  async function handleRefreshCache() {
    if (!token || refreshingCache) return;
    setRefreshingCache(true);
    try {
      const res = await fetch(`${env.apiBaseUrl}/api/v1/admin/integrations/refresh-cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCacheRefreshedAt(new Date());
        await integrationAuditApi.logAction({
          actorEmail: adminEmail,
          actorRole: adminRole,
          actionType: 'CACHE_REFRESH',
          fieldGroup: 'system',
          changeSummary: `Integration config cache manually refreshed by ${adminEmail}.`,
        });
        await load();
      }
    } finally {
      setRefreshingCache(false);
    }
  }

  function handleCreated(p: IntegrationProviderResponse) {
    setShowCreate(false);
    setData((prev) => {
      if (!prev) return prev;
      const byCategory = { ...prev.byCategory };
      byCategory[p.category] = [...(byCategory[p.category] ?? []), p];
      return { total: prev.total + 1, byCategory };
    });
    setSelectedProvider(p);
  }

  function handleUpdated(updated: IntegrationProviderResponse) {
    setData((prev) => {
      if (!prev) return prev;
      const byCategory = { ...prev.byCategory };
      for (const cat of Object.keys(byCategory)) {
        byCategory[cat] = byCategory[cat].map((p) => p.id === updated.id ? updated : p);
      }
      return { ...prev, byCategory };
    });
  }

  function handleDeleted(id: string) {
    setData((prev) => {
      if (!prev) return prev;
      const byCategory: Record<string, IntegrationProviderResponse[]> = {};
      let total = prev.total;
      for (const [cat, providers] of Object.entries(prev.byCategory)) {
        const filtered = providers.filter((p) => p.id !== id);
        if (filtered.length < providers.length) total--;
        if (filtered.length > 0) byCategory[cat] = filtered;
      }
      return { total, byCategory };
    });
  }

  const allProviders = data ? Object.values(data.byCategory).flat() : [];
  const filteredProviders = allProviders.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.providerName.toLowerCase().includes(q) || p.providerCode.includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const groupedFiltered: Record<string, IntegrationProviderResponse[]> = {};
  for (const p of filteredProviders) {
    if (!groupedFiltered[p.category]) groupedFiltered[p.category] = [];
    groupedFiltered[p.category].push(p);
  }

  const categoriesPresent = data ? Object.keys(data.byCategory) : [];

  const VIEW_TABS: { key: PageView; label: string; icon: React.ElementType }[] = [
    { key: 'integrations', label: 'Integrations', icon: Settings },
    { key: 'ai',           label: 'AI / LLM',     icon: BrainCircuit },
    { key: 'payments',     label: 'Payments',      icon: CreditCard },
    { key: 'whatsapp',     label: 'WhatsApp',      icon: MessageCircle },
    { key: 'email',        label: 'Email',         icon: Mail },
    { key: 'crm',          label: 'CRM',           icon: Users },
    { key: 'analytics',    label: 'Analytics',     icon: BarChart2 },
    { key: 'storage',      label: 'Storage',       icon: HardDrive },
    { key: 'scheduling',   label: 'Scheduling',    icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[#080C18]">

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(ROUTES.ADMIN)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            <span className="text-sm font-semibold text-white hidden sm:inline shrink-0">Integration Control Center</span>

            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 ml-2 overflow-x-auto max-w-[600px]">
              {VIEW_TABS.map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setView(t.key)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      view === t.key ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <TIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1">
              <Shield className="w-2.5 h-2.5" />
              {roleLabel(adminRole)}
            </span>
            <button
              onClick={() => navigate(ROUTES.ADMIN_HEALTH)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Health</span>
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_WEBHOOKS)}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Webhook className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Webhooks</span>
            </button>
            <button
              onClick={() => navigate(ROUTES.ADMIN_FLAGS)}
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flags</span>
            </button>

            {view === 'integrations' && (
              <>
                {permissions.canViewAuditLog && (
                  <button
                    onClick={() => { setShowAudit(true); loadAllAudit(); }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Audit Log</span>
                  </button>
                )}
                <button
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {permissions.canRefreshCache && (
                  <button
                    onClick={handleRefreshCache}
                    disabled={refreshingCache}
                    title={cacheRefreshedAt ? `Last refreshed: ${cacheRefreshedAt.toLocaleTimeString('en-IN')}` : 'Force the backend to re-read all provider configs from the database'}
                    className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${refreshingCache ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshingCache ? 'Refreshing…' : 'Flush Cache'}</span>
                  </button>
                )}
                {permissions.canEditConfig && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Provider
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {view === 'ai'        && <AIManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}
        {view === 'payments'  && <PaymentManagementPanel adminEmail={adminEmail} adminRole={adminRole} appBaseUrl={env.apiBaseUrl || window.location.origin} />}
        {view === 'whatsapp'  && <WhatsAppManagementPanel adminEmail={adminEmail} adminRole={adminRole} appBaseUrl={env.apiBaseUrl || window.location.origin} />}
        {view === 'email'     && <EmailManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}
        {view === 'crm'       && <CrmManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}
        {view === 'analytics' && <AnalyticsManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}
        {view === 'storage'   && <StorageManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}
        {view === 'scheduling'&& <SchedulingManagementPanel adminEmail={adminEmail} adminRole={adminRole} />}

        {view === 'integrations' && (
          <>
            <div className="mb-7">
              <h1 className="text-xl font-bold text-white">Integration Control Center</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage third-party provider credentials, settings, and connectivity. Credentials are AES-256-GCM encrypted at rest.
                {adminRole === 'VIEWER' && <span className="ml-2 text-amber-400/80">You have view-only access.</span>}
              </p>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading providers…</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <WifiOff className="w-10 h-10 text-red-400/50" />
                <p className="text-sm text-red-400">{error}</p>
                <p className="text-xs text-slate-600 text-center max-w-sm">
                  The Java backend may not be running. Ensure <code className="text-slate-500">VITE_API_BASE_URL</code> is set correctly.
                </p>
                <button onClick={load} className="inline-flex items-center gap-2 text-xs text-slate-300 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.10] rounded-lg px-4 py-2 transition-colors mt-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {!loading && !error && data && (
              <>
                <SummaryBar data={data} />

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1 max-w-xs">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input
                      type="text"
                      placeholder="Search providers…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-300 text-xs rounded-xl placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeCategory === 'all' ? 'text-white border-blue-500/40 bg-blue-500/10' : 'text-slate-500 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'}`}
                    >
                      All
                    </button>
                    {categoriesPresent.map((cat) => {
                      const meta = CATEGORY_META[cat];
                      const CatIcon = meta?.icon ?? Settings;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeCategory === cat ? `${meta?.color ?? 'text-slate-300'} border-current/30 bg-current/10` : 'text-slate-500 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {meta?.label ?? cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {Object.keys(groupedFiltered).length === 0 ? (
                  <div className="text-center py-20 text-slate-600">
                    <Settings className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No providers found.</p>
                    {permissions.canEditConfig && (
                      <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add your first provider
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedFiltered).map(([cat, providers]) => (
                      <CategorySection key={cat} category={cat} providers={providers} onSelect={setSelectedProvider} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Provider detail drawer */}
      {selectedProvider && token && (
        <ProviderDrawer
          provider={selectedProvider}
          token={token}
          onClose={() => setSelectedProvider(null)}
          onUpdated={(p) => { handleUpdated(p); setSelectedProvider(p); }}
          onDelete={handleDeleted}
          actorEmail={adminEmail}
          actorRole={adminRole}
          canEdit={permissions.canEditConfig}
          canRotate={permissions.canRotateCredentials}
          canTest={permissions.canTestIntegration}
          canDelete={permissions.canDeleteProvider}
          canSetPrimary={permissions.canSetPrimary}
          canEnableDisable={permissions.canEnableDisable}
        />
      )}

      {/* Create provider modal */}
      {showCreate && token && permissions.canEditConfig && (
        <CreateProviderModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          actorEmail={adminEmail}
          actorRole={adminRole}
        />
      )}

      {/* Global audit log panel */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowAudit(false)}>
          <div className="flex-1 bg-black/40" />
          <div
            className="w-full max-w-xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
              <div>
                <p className="text-sm font-semibold text-white">Integration Audit Log</p>
                <p className="text-xs text-slate-600 mt-0.5">All config changes made via the dashboard</p>
              </div>
              <button onClick={() => setShowAudit(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {loadingAudit ? (
                <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
              ) : allAuditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-600">
                  <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No audit entries yet.</p>
                  <p className="text-xs mt-1">Credential updates, setting changes, and test runs will appear here.</p>
                </div>
              ) : allAuditLogs.map((log) => (
                <SupabaseAuditRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
