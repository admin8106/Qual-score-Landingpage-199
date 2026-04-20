import { useState } from 'react';
import { AlertTriangle, X, Shield } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  requireTyping?: string;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  loading = false,
  requireTyping,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');

  const canConfirm = !requireTyping || typed === requireTyping;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0D1120] border border-white/[0.12] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            {danger
              ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              : <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            }
            <h3 className={`text-sm font-semibold ${danger ? 'text-red-300' : 'text-white'}`}>{title}</h3>
          </div>
          <button onClick={onCancel} className="text-slate-600 hover:text-slate-400 transition-colors ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          {requireTyping && (
            <div>
              <p className="text-xs text-slate-600 mb-1.5">
                Type <span className="font-mono text-slate-400">"{requireTyping}"</span> to confirm
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-500/40 transition-colors placeholder-slate-700"
                placeholder={requireTyping}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.07]">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 text-sm text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={`flex-1 text-sm font-medium rounded-xl px-4 py-2.5 transition-colors disabled:opacity-40 ${
              danger
                ? 'text-white bg-red-600 hover:bg-red-500'
                : 'text-white bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
