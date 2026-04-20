import { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, Settings, Star, GitBranch, ToggleLeft, ToggleRight,
  CheckCircle, AlertTriangle, Save, X, ChevronDown, Activity,
  BookOpen, Sliders, Cpu,
} from 'lucide-react';
import {
  aiProviderApi,
  type AiProviderConfig,
  type AiReportSettings,
  type AiPromptVersion,
} from '../../api/services/aiProviders';
import LLMProviderCard from './LLMProviderCard';
import LLMProviderDrawer from './LLMProviderDrawer';

type PanelTab = 'providers' | 'report-settings' | 'prompt-versions';

// ─── Prompt Version List ──────────────────────────────────────────────────────

interface PromptVersionsPanelProps {
  versions: AiPromptVersion[];
  reportSettings: AiReportSettings | null;
  adminEmail: string;
  onSettingsChange: (s: AiReportSettings) => void;
  onVersionsChange: (v: AiPromptVersion[]) => void;
}

function PromptVersionsPanel({
  versions, reportSettings, adminEmail, onSettingsChange, onVersionsChange
}: PromptVersionsPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('REPORT_GEN');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingActive, setSavingActive] = useState('');
  const [settingActive, setSettingActive] = useState('');

  async function handleAdd() {
    if (!newCode.trim() || !newLabel.trim()) return;
    setSaving(true);
    const v = await aiProviderApi.createPromptVersion({
      version_code: newCode.trim(),
      version_label: newLabel.trim(),
      prompt_type: newType,
      is_active: true,
      release_notes: newNotes.trim() || null,
    });
    onVersionsChange([v, ...versions]);
    setNewCode('');
    setNewLabel('');
    setNewNotes('');
    setShowAdd(false);
    setSaving(false);
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setSavingActive(id);
    await aiProviderApi.togglePromptVersionActive(id, isActive);
    onVersionsChange(versions.map((v) => v.id === id ? { ...v, is_active: isActive } : v));
    setSavingActive('');
  }

  async function handleSetActive(code: string) {
    if (!reportSettings) return;
    setSettingActive(code);
    const updated = await aiProviderApi.upsertReportSettings(
      { ...reportSettings, prompt_version: code },
      adminEmail
    );
    onSettingsChange(updated);
    setSettingActive('');
  }

  const byType = versions.reduce<Record<string, AiPromptVersion[]>>((acc, v) => {
    if (!acc[v.prompt_type]) acc[v.prompt_type] = [];
    acc[v.prompt_type].push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Prompt Versions</p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Version
        </button>
      </div>

      {showAdd && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-500 font-semibold">Register New Prompt Version</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Version Code</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="B-1.2"
                className="w-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-sm font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Prompt Type</label>
              <div className="relative">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
                >
                  <option value="REPORT_GEN" className="bg-[#0D1120]">Report Generator</option>
                  <option value="LINKEDIN_ANALYZER" className="bg-[#0D1120]">LinkedIn Analyzer</option>
                  <option value="OTHER" className="bg-[#0D1120]">Other</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Version Label</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Report Generator v1.2 — August 2026"
              className="w-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Release Notes</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              placeholder="What changed in this version…"
              className="w-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-slate-400 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06]">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving || !newCode.trim() || !newLabel.trim()}
              className="text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-1.5 transition-colors font-medium"
            >
              {saving ? 'Saving…' : 'Register Version'}
            </button>
          </div>
        </div>
      )}

      {Object.entries(byType).map(([type, versionList]) => (
        <div key={type}>
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">
            {type === 'REPORT_GEN' ? 'Report Generator' : type === 'LINKEDIN_ANALYZER' ? 'LinkedIn Analyzer' : type}
          </p>
          <div className="space-y-2">
            {versionList.map((v) => {
              const isCurrentActive = reportSettings?.prompt_version === v.version_code && v.prompt_type === 'REPORT_GEN';
              return (
                <div
                  key={v.id}
                  className={`bg-white/[0.02] border rounded-xl px-4 py-3 transition-colors ${
                    isCurrentActive ? 'border-blue-500/30' : 'border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium text-slate-300">{v.version_code}</span>
                        {isCurrentActive && (
                          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                            Active in Report Gen
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 bg-white/[0.03]'}`}>
                          {v.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{v.version_label}</p>
                      {v.release_notes && (
                        <p className="text-xs text-slate-700 mt-1">{v.release_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.prompt_type === 'REPORT_GEN' && !isCurrentActive && v.is_active && (
                        <button
                          onClick={() => handleSetActive(v.version_code)}
                          disabled={settingActive === v.version_code}
                          className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
                        >
                          {settingActive === v.version_code ? '…' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(v.id, !v.is_active)}
                        disabled={savingActive === v.id}
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        {v.is_active
                          ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                          : <ToggleLeft className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {versions.length === 0 && (
        <div className="text-center py-10 text-slate-600">
          <BookOpen className="w-7 h-7 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No prompt versions registered.</p>
        </div>
      )}
    </div>
  );
}

// ─── Report Settings Panel ────────────────────────────────────────────────────

interface ReportSettingsPanelProps {
  settings: AiReportSettings | null;
  versions: AiPromptVersion[];
  adminEmail: string;
  onSaved: (s: AiReportSettings) => void;
}

function ReportSettingsPanel({ settings, versions, adminEmail, onSaved }: ReportSettingsPanelProps) {
  const [maxRetries, setMaxRetries]             = useState(settings?.max_retries ?? 1);
  const [fallback, setFallback]                 = useState(settings?.fallback_to_template ?? true);
  const [strictness, setStrictness]             = useState(settings?.validation_strictness ?? 'STRICT');
  const [tempOverride, setTempOverride]         = useState<string>(
    settings?.default_temperature != null ? String(settings.default_temperature) : ''
  );
  const [promptVersion, setPromptVersion]       = useState(settings?.prompt_version ?? 'B-1.1');
  const [usageNotes, setUsageNotes]             = useState(settings?.model_usage_notes ?? '');
  const [saving, setSaving]                     = useState(false);
  const [success, setSuccess]                   = useState(false);
  const [error, setError]                       = useState('');

  useEffect(() => {
    if (settings) {
      setMaxRetries(settings.max_retries);
      setFallback(settings.fallback_to_template);
      setStrictness(settings.validation_strictness);
      setTempOverride(settings.default_temperature != null ? String(settings.default_temperature) : '');
      setPromptVersion(settings.prompt_version);
      setUsageNotes(settings.model_usage_notes ?? '');
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const temp = tempOverride.trim() ? parseFloat(tempOverride) : null;
      const saved = await aiProviderApi.upsertReportSettings(
        {
          max_retries: maxRetries,
          fallback_to_template: fallback,
          validation_strictness: strictness as 'STRICT' | 'LENIENT' | 'OFF',
          default_temperature: temp,
          prompt_version: promptVersion,
          model_usage_notes: usageNotes.trim() || null,
        },
        adminEmail
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings.');
    }
    setSaving(false);
  }

  const reportGenVersions = versions.filter((v) => v.prompt_type === 'REPORT_GEN' && v.is_active);

  return (
    <div className="space-y-5">
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Settings saved successfully.
        </div>
      )}

      {/* Prompt version */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Prompt Version</p>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Report Generation Prompt</label>
          <div className="relative">
            <select
              value={promptVersion}
              onChange={(e) => setPromptVersion(e.target.value)}
              className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm font-mono rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
            >
              {reportGenVersions.map((v) => (
                <option key={v.version_code} value={v.version_code} className="bg-[#0D1120]">
                  {v.version_code} — {v.version_label}
                </option>
              ))}
              {!reportGenVersions.some((v) => v.version_code === promptVersion) && (
                <option value={promptVersion} className="bg-[#0D1120]">{promptVersion}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
          <p className="text-xs text-slate-700 mt-1.5">
            This version is passed to the backend and stored in each generated report for audit.
          </p>
        </div>
      </div>

      {/* Retry & fallback */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Retry & Fallback</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1.5">Max Retries</label>
            <input
              type="number"
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
              min={0} max={5}
              className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40"
            />
            <p className="text-xs text-slate-700 mt-1">Retries per report on JSON parse failure.</p>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1.5">Validation Strictness</label>
            <div className="relative">
              <select
                value={strictness}
                onChange={(e) => setStrictness(e.target.value)}
                className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
              >
                <option value="STRICT"  className="bg-[#0D1120]">STRICT — all 10 fields required</option>
                <option value="LENIENT" className="bg-[#0D1120]">LENIENT — partial responses accepted</option>
                <option value="OFF"     className="bg-[#0D1120]">OFF — no validation</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFallback((v) => !v)}
          className={`inline-flex items-center gap-2 text-sm transition-colors ${fallback ? 'text-emerald-400' : 'text-slate-500'}`}
        >
          {fallback
            ? <ToggleRight className="w-5 h-5 text-emerald-400" />
            : <ToggleLeft className="w-5 h-5 text-slate-600" />
          }
          Fallback to rule-based report when AI fails
        </button>
        <p className="text-xs text-slate-700 -mt-1">
          When enabled, a deterministic rule-based report is generated if all AI retries fail.
          Stored with reportStatus = RULE_BASED.
        </p>
      </div>

      {/* Temperature override */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Temperature Override</p>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Global Temperature <span className="text-slate-700">(leave blank to use per-provider value)</span></label>
          <input
            type="number"
            value={tempOverride}
            onChange={(e) => setTempOverride(e.target.value)}
            min={0} max={2} step={0.05}
            placeholder="e.g. 0.2 (blank = use provider config)"
            className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700"
          />
          <p className="text-xs text-slate-700 mt-1">
            When set, overrides the temperature value in the active provider config for all report generation calls.
          </p>
        </div>
      </div>

      {/* Usage notes */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model Usage Notes</p>
        <textarea
          value={usageNotes}
          onChange={(e) => setUsageNotes(e.target.value)}
          rows={4}
          placeholder="Cost per report, observed quality, edge cases, recommendations for model switching…"
          className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 placeholder-slate-700 resize-none"
        />
      </div>

      {settings?.updated_at && (
        <p className="text-xs text-slate-700 text-center">
          Last updated {new Date(settings.updated_at).toLocaleString('en-IN')}
          {settings.updated_by_admin_id && <> by {settings.updated_by_admin_id}</>}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2.5 transition-colors font-medium"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : 'Save Report Settings'}
      </button>
    </div>
  );
}

// ─── Main AI Management Panel ─────────────────────────────────────────────────

interface Props {
  adminEmail: string;
  adminRole?: string;
}

export default function AIManagementPanel({ adminEmail, adminRole = 'VIEWER' }: Props) {
  const [tab, setTab] = useState<PanelTab>('providers');
  const [providers, setProviders]         = useState<AiProviderConfig[]>([]);
  const [testLogMap, setTestLogMap]       = useState<Record<string, import('../../api/services/aiProviders').AiTestLog>>({});
  const [reportSettings, setReportSettings] = useState<AiReportSettings | null>(null);
  const [promptVersions, setPromptVersions] = useState<AiPromptVersion[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AiProviderConfig | null>(null);
  const [showNewDrawer, setShowNewDrawer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [provs, settings, versions] = await Promise.all([
        aiProviderApi.listProviders(),
        aiProviderApi.getReportSettings(),
        aiProviderApi.listPromptVersions(),
      ]);
      setProviders(provs);
      setReportSettings(settings);
      setPromptVersions(versions);

      const logMap: Record<string, import('../../api/services/aiProviders').AiTestLog> = {};
      await Promise.all(
        provs.map(async (p) => {
          const logs = await aiProviderApi.getTestLogs(p.id);
          if (logs.length > 0) logMap[p.id] = logs[0];
        })
      );
      setTestLogMap(logMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI management data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleProviderSaved(p: AiProviderConfig) {
    setProviders((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = p;
        return updated;
      }
      return [p, ...prev];
    });
    setSelectedProvider(p);
    setShowNewDrawer(false);
  }

  function handleProviderDeleted(id: string) {
    setProviders((prev) => prev.filter((p) => p.id !== id));
    setSelectedProvider(null);
  }

  const primaryProvider = providers.find((p) => p.is_primary);
  const activeCount = providers.filter((p) => p.is_active).length;

  const TABS: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: 'providers',       label: 'Providers',       icon: Cpu },
    { key: 'report-settings', label: 'Report Settings', icon: Sliders },
    { key: 'prompt-versions', label: 'Prompt Versions', icon: BookOpen },
  ];

  return (
    <div>
      {/* Panel header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">AI / LLM Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure AI providers, report generation behavior, and prompt versions without code changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && providers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-xl font-bold text-slate-300">{providers.length}</p>
            <p className="text-xs text-slate-600 mt-0.5">Total Providers</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-xl font-bold text-emerald-400">{activeCount}</p>
            <p className="text-xs text-slate-600 mt-0.5">Active</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            {primaryProvider ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <p className="text-sm font-semibold text-amber-400 truncate">{primaryProvider.provider_name}</p>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-mono">{primaryProvider.model_name}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600">No primary set</p>
                <p className="text-xs text-slate-700 mt-0.5">Set a provider as primary</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] mb-5">
        {TABS.map((t) => {
          const TIcon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center py-10 gap-3">
          <AlertTriangle className="w-7 h-7 text-red-400/50" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Tab: Providers */}
      {!loading && !error && tab === 'providers' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewDrawer(true)}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Provider
            </button>
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-14 text-slate-600">
              <Cpu className="w-9 h-9 mx-auto mb-3 opacity-25" />
              <p className="text-sm">No AI providers configured yet.</p>
              <p className="text-xs mt-1">Add your first provider to enable AI-powered report generation.</p>
              <button
                onClick={() => setShowNewDrawer(true)}
                className="mt-4 inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add OpenAI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {providers.map((p) => (
                <LLMProviderCard
                  key={p.id}
                  provider={p}
                  latestLog={testLogMap[p.id] ?? null}
                  onClick={() => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Report Settings */}
      {!loading && !error && tab === 'report-settings' && (
        <ReportSettingsPanel
          settings={reportSettings}
          versions={promptVersions}
          adminEmail={adminEmail}
          onSaved={setReportSettings}
        />
      )}

      {/* Tab: Prompt Versions */}
      {!loading && !error && tab === 'prompt-versions' && (
        <PromptVersionsPanel
          versions={promptVersions}
          reportSettings={reportSettings}
          adminEmail={adminEmail}
          onSettingsChange={setReportSettings}
          onVersionsChange={setPromptVersions}
        />
      )}

      {/* Provider detail drawer */}
      {selectedProvider && (
        <LLMProviderDrawer
          provider={selectedProvider}
          isNew={false}
          adminEmail={adminEmail}
          onClose={() => setSelectedProvider(null)}
          onSaved={handleProviderSaved}
          onDeleted={handleProviderDeleted}
        />
      )}

      {/* New provider drawer */}
      {showNewDrawer && (
        <LLMProviderDrawer
          provider={null}
          isNew={true}
          adminEmail={adminEmail}
          onClose={() => setShowNewDrawer(false)}
          onSaved={handleProviderSaved}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}
