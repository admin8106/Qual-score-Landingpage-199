import { CommChannel, CommTrigger } from './communicationService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommEvent {
  id: string;
  trigger: CommTrigger;
  channel: CommChannel;
  recipient: string;
  templateName: string;
  subject?: string;
  previewBody: string;
  status: 'would_fire' | 'sent' | 'failed' | 'skipped';
  note: string;
  firedAt: string;
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'qs_comm_events';
const MAX_EVENTS = 50;

// ─── In-memory store + listeners ─────────────────────────────────────────────

let _events: CommEvent[] = loadFromStorage();
const _listeners: Set<() => void> = new Set();

function loadFromStorage(): CommEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CommEvent[];
  } catch {
    // ignore
  }
  return [];
}

function persist(events: CommEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

function notify() {
  _listeners.forEach((fn) => fn());
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function logCommEvent(event: Omit<CommEvent, 'id' | 'firedAt'>): CommEvent {
  const entry: CommEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    firedAt: new Date().toISOString(),
  };
  _events = [entry, ..._events].slice(0, MAX_EVENTS);
  persist(_events);
  notify();
  return entry;
}

export function getCommEvents(): CommEvent[] {
  return [..._events];
}

export function clearCommEvents(): void {
  _events = [];
  persist(_events);
  notify();
}

export function subscribeCommEvents(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getEventsByTrigger(trigger: CommTrigger): CommEvent[] {
  return _events.filter((e) => e.trigger === trigger);
}

export function getEventCount(): number {
  return _events.length;
}

// ─── Trigger display config ───────────────────────────────────────────────────

export const TRIGGER_CONFIG: Record<CommTrigger, { label: string; color: string; dotColor: string }> = {
  report_generated: {
    label: 'Report Generated',
    color: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  report_viewed: {
    label: 'Report Viewed',
    color: 'text-cyan-400',
    dotColor: 'bg-cyan-400',
  },
  consultation_booked: {
    label: 'Consultation Booked',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  high_priority_lead_identified: {
    label: 'High Priority Lead',
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
};

export const CHANNEL_CONFIG: Record<CommChannel, { label: string; icon: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'WA', color: 'text-emerald-400 bg-emerald-500/10' },
  email: { label: 'Email', icon: 'EM', color: 'text-red-400 bg-red-500/10' },
  crm: { label: 'CRM', icon: 'CR', color: 'text-orange-400 bg-orange-500/10' },
  internal: { label: 'Internal', icon: 'IN', color: 'text-amber-400 bg-amber-500/10' },
};
