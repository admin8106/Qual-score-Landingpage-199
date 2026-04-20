import { useState } from 'react';
import { Eye, EyeOff, Shield, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

export function TextInput({ value, onChange, placeholder, mono, disabled, type = 'text' }: {
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

export function TextareaInput({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/40 transition-colors placeholder-slate-700 resize-none"
    />
  );
}

export function SelectInput({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-blue-500/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0D1120]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
    </div>
  );
}

export function SecretField({ label, hint, maskedValue, value, onChange, placeholder }: {
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

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`inline-flex items-center gap-2 text-sm transition-colors ${checked ? 'text-emerald-400' : 'text-slate-500'}`}>
      {checked ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
      {label}
    </button>
  );
}

export function SectionBox({ title, icon: Icon, iconColor, children }: {
  title: string; icon?: React.ElementType; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor ?? 'text-slate-500'}`} />}
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function InfoBox({ children, color = 'amber' }: { children: React.ReactNode; color?: 'amber' | 'sky' | 'red' }) {
  const cls = {
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-300/80',
    sky:   'bg-sky-500/5 border-sky-500/20 text-sky-300/80',
    red:   'bg-red-500/5 border-red-500/20 text-red-300/80',
  }[color];
  return (
    <div className={`border rounded-xl px-4 py-3 text-xs ${cls}`}>
      {children}
    </div>
  );
}

export function SaveFooter({ saving, isNew, onSave, accentBg }: {
  saving: boolean; isNew: boolean; onSave: () => void; accentBg: string;
}) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`w-full inline-flex items-center justify-center gap-2 text-sm text-white ${accentBg} disabled:opacity-50 rounded-xl py-2.5 transition-colors font-medium`}
    >
      {saving ? 'Saving…' : isNew ? 'Create Provider' : 'Save Changes'}
    </button>
  );
}

export function AlertBanner({ text, type }: { text: string; type: 'error' | 'success' }) {
  if (type === 'success') return (
    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
      {text}
    </div>
  );
  return (
    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      {text}
    </div>
  );
}

export function DeleteRow({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="pt-1 border-t border-white/[0.05]">
      {confirm ? (
        <div className="flex items-center gap-3">
          <p className="text-xs text-red-400 flex-1">Delete this provider? Cannot be undone.</p>
          <button onClick={() => setConfirm(false)} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">Delete</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Delete provider
        </button>
      )}
    </div>
  );
}
