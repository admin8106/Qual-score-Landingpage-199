import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Trash2, Radio, Copy, Check } from 'lucide-react';
import {
  CommEvent,
  getCommEvents,
  clearCommEvents,
  subscribeCommEvents,
  TRIGGER_CONFIG,
  CHANNEL_CONFIG,
} from '../../services/commEventStore';

// ─── Only render in dev mode ──────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  would_fire: { label: 'WOULD FIRE', cls: 'text-amber-400 bg-amber-500/10' },
  sent:       { label: 'SENT',       cls: 'text-emerald-400 bg-emerald-500/10' },
  failed:     { label: 'FAILED',     cls: 'text-red-400 bg-red-500/10' },
  skipped:    { label: 'SKIPPED',    cls: 'text-slate-500 bg-white/[0.04]' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-600" />}
    </button>
  );
}

// ─── Single event row ─────────────────────────────────────────────────────────

function EventRow({ event }: { event: CommEvent }) {
  const [expanded, setExpanded] = useState(false);
  const trigger = TRIGGER_CONFIG[event.trigger];
  const channel = CHANNEL_CONFIG[event.channel];

  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${trigger.dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${trigger.color}`}>{trigger.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${channel.color}`}>
              {channel.label}
            </span>
            {(() => {
              const sc = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.would_fire;
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${sc.cls}`}>
                  {sc.label}
                </span>
              );
            })()}
            <span className="text-xs text-slate-700 ml-auto shrink-0">{timeAgo(event.firedAt)}</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 truncate">{event.templateName}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-slate-700 shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-700 shrink-0 mt-0.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Recipient</span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{event.recipient}</p>
          </div>

          {event.subject && (
            <div className="bg-black/30 rounded-lg p-2.5">
              <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block mb-1">Subject</span>
              <p className="text-xs text-slate-400">{event.subject}</p>
            </div>
          )}

          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Message Preview</span>
              <CopyButton text={event.previewBody} />
            </div>
            <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-sans">{event.previewBody}</pre>
          </div>

          <div className="bg-black/30 rounded-lg p-2.5">
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block mb-1">Note</span>
            <p className="text-xs text-slate-500 italic">{event.note}</p>
          </div>

          <div className="flex gap-4 text-xs text-slate-700">
            <span>ID: <span className="font-mono">{event.id}</span></span>
            <span>{new Date(event.firedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DevEventLog() {
  const [events, setEvents] = useState<CommEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setEvents(getCommEvents());
    const unsub = subscribeCommEvents(() => {
      setEvents(getCommEvents());
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    });
    return unsub;
  }, []);

  if (!IS_DEV) return null;

  const count = events.length;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 bg-[#0D1120] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 shadow-2xl transition-all hover:scale-105"
        title="Communication Event Log"
      >
        <Radio className={`w-3.5 h-3.5 ${count > 0 ? 'text-emerald-400' : 'text-slate-600'} ${pulse ? 'animate-ping' : ''}`} />
        <span className="text-xs font-semibold text-slate-300">Comm Events</span>
        {count > 0 && (
          <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
            {count}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="fixed bottom-16 right-5 z-[9999] w-[360px] max-h-[520px] flex flex-col bg-[#0A0F1E] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-bold text-white">Automation Event Log</span>
              <span className="text-xs text-slate-600">DEV ONLY</span>
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={clearCommEvents}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-600 hover:text-red-400 transition-colors"
                  title="Clear all events"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-600 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 px-4 py-2 border-b border-white/[0.05] bg-white/[0.01] shrink-0 flex-wrap">
            {['whatsapp', 'email', 'crm', 'internal'].map((ch) => {
              const c = CHANNEL_CONFIG[ch as keyof typeof CHANNEL_CONFIG];
              return (
                <div key={ch} className="flex items-center gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${c.color}`}>{c.label}</span>
                </div>
              );
            })}
            <span className="text-xs text-slate-700 ml-auto">would_fire = not sent yet</span>
          </div>

          {/* Event list */}
          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Radio className="w-6 h-6 text-slate-700" />
                <p className="text-xs text-slate-600">No automation events yet.</p>
                <p className="text-xs text-slate-700">Complete the funnel to see triggers fire here.</p>
              </div>
            ) : (
              events.map((e) => <EventRow key={e.id} event={e} />)
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] shrink-0">
            <p className="text-xs text-slate-700">
              {count} event{count !== 1 ? 's' : ''} logged · No real messages sent · Persisted in localStorage
            </p>
          </div>
        </div>
      )}
    </>
  );
}
