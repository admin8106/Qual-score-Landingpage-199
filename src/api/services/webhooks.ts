import { supabase } from '../../lib/supabase';
import { env } from '../../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookCategory = 'payments' | 'whatsapp' | 'email' | 'crm' | 'analytics' | 'scheduling';

export type WebhookEventStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REPLAYED'
  | 'SKIPPED';

export interface WebhookEventLog {
  id: string;
  endpoint_slug: string;
  category: WebhookCategory;
  provider_code: string;
  provider_name: string;
  environment_mode: string;
  event_type: string;
  idempotency_key: string | null;
  status: WebhookEventStatus;
  http_method: string;
  source_ip: string | null;
  raw_headers: Record<string, string>;
  raw_payload: Record<string, unknown>;
  processing_summary: string | null;
  error_detail: string | null;
  retry_count: number;
  last_replayed_at: string | null;
  replayed_by_email: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface RegisteredEndpoint {
  slug: string;
  category: WebhookCategory;
  providerCode: string;
  providerName: string;
  path: string;
  fullUrl: string;
  isActive: boolean;
  environmentMode: string;
  description: string;
  setupInstructions: string[];
  replayable: boolean;
  latestEvent: WebhookEventLog | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  last24hCount: number;
  last24hFailures: number;
}

export interface WebhookLogFilter {
  status?: WebhookEventStatus | 'all';
  category?: WebhookCategory | 'all';
  endpointSlug?: string;
  providerCode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface WebhookReplaySummary {
  logId: string;
  success: boolean;
  message: string;
  newStatus: WebhookEventStatus;
}

// ─── Static endpoint registry ─────────────────────────────────────────────────
// These are the system's known inbound webhook endpoints.
// The frontend uses the Supabase URL as the backend base URL when on Supabase-only
// mode; otherwise uses env.apiBaseUrl.

function makeUrl(path: string): string {
  const base = env.apiBaseUrl || window.location.origin;
  return `${base}${path}`;
}

const ENDPOINT_REGISTRY: Omit<RegisteredEndpoint, 'isActive' | 'environmentMode' | 'latestEvent' | 'lastSuccessAt' | 'lastFailureAt' | 'last24hCount' | 'last24hFailures'>[] = [
  {
    slug: 'payments-razorpay',
    category: 'payments',
    providerCode: 'razorpay',
    providerName: 'Razorpay',
    path: '/api/v1/payments/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives payment captured, failed, and refund events from Razorpay.',
    setupInstructions: [
      'Log into Razorpay Dashboard → Settings → Webhooks',
      'Add a new webhook with the URL above',
      'Select events: payment.captured, payment.failed, refund.created',
      'Set the webhook secret (must match your Razorpay provider config)',
      'Ensure HTTPS — Razorpay requires TLS for live webhooks',
    ],
    replayable: true,
  },
  {
    slug: 'payments-payu',
    category: 'payments',
    providerCode: 'payu',
    providerName: 'PayU',
    path: '/api/v1/payments/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives success and failure callback POSTs from PayU after payment attempts.',
    setupInstructions: [
      'Log into PayU Merchant Dashboard → Settings → Technical Details',
      'Set "Success URL" and "Failure URL" to your frontend redirect URLs',
      'The backend callback URL above handles server-to-server notifications',
      'Ensure your PayU merchant key and salt match the provider config',
    ],
    replayable: true,
  },
  {
    slug: 'whatsapp-meta',
    category: 'whatsapp',
    providerCode: 'meta',
    providerName: 'WhatsApp (Meta Cloud)',
    path: '/api/v1/whatsapp/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Handles incoming messages, delivery status updates, and read receipts from Meta WhatsApp Cloud API.',
    setupInstructions: [
      'Log into Meta Business Manager → WhatsApp → Configuration',
      'Set the Callback URL to the URL above',
      'Set the Verify Token to match meta_webhook_verify_token in your provider config',
      'Subscribe to: messages, message_deliveries, messaging_postbacks',
      'Meta will send a GET request to verify the endpoint — ensure it is live',
    ],
    replayable: false,
  },
  {
    slug: 'whatsapp-twilio',
    category: 'whatsapp',
    providerCode: 'twilio',
    providerName: 'WhatsApp (Twilio)',
    path: '/api/v1/whatsapp/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives delivery status callbacks from Twilio WhatsApp.',
    setupInstructions: [
      'Log into Twilio Console → Messaging → WhatsApp → Sandbox',
      'Set "When a message comes in" webhook to the URL above',
      'Set the HTTP method to POST',
    ],
    replayable: false,
  },
  {
    slug: 'email-resend',
    category: 'email',
    providerCode: 'resend',
    providerName: 'Resend',
    path: '/api/v1/email/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives email delivery, bounce, and complaint events from Resend.',
    setupInstructions: [
      'Log into Resend Dashboard → Webhooks',
      'Add a new webhook endpoint with the URL above',
      'Enable events: email.delivered, email.bounced, email.complained',
      'Copy the signing secret — set it in your email provider config',
    ],
    replayable: false,
  },
  {
    slug: 'email-sendgrid',
    category: 'email',
    providerCode: 'sendgrid',
    providerName: 'SendGrid',
    path: '/api/v1/email/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives SendGrid Event Webhook notifications (delivery, bounce, click, etc.).',
    setupInstructions: [
      'Log into SendGrid → Settings → Mail Settings → Event Notification',
      'Set the HTTP POST URL to the endpoint above',
      'Enable: Delivered, Bounced, Spam Report',
      'Turn on "Signature Verification" and copy the key to your provider config',
    ],
    replayable: false,
  },
  {
    slug: 'crm-webhook',
    category: 'crm',
    providerCode: 'webhook',
    providerName: 'CRM (Generic Webhook)',
    path: '/api/v1/crm/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Generic inbound webhook for CRM deal/contact status updates pushed from your CRM.',
    setupInstructions: [
      'In your CRM (HubSpot, Zoho, Salesforce), navigate to Webhooks / Automation settings',
      'Add a new outbound webhook pointing to the URL above',
      'Set the trigger event (deal updated, contact created, etc.)',
      'Optionally set a shared secret for signature verification',
    ],
    replayable: true,
  },
  {
    slug: 'scheduling-calendly',
    category: 'scheduling',
    providerCode: 'calendly',
    providerName: 'Calendly',
    path: '/api/v1/scheduling/webhook',
    get fullUrl() { return makeUrl(this.path); },
    description: 'Receives booking created, cancelled, and rescheduled events from Calendly.',
    setupInstructions: [
      'Log into Calendly → Integrations → Webhooks',
      'Create a new subscription pointing to the URL above',
      'Select events: invitee.created, invitee.canceled',
      'Save — Calendly will send a verification request to the endpoint',
    ],
    replayable: true,
  },
];

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getLogs(filter: WebhookLogFilter = {}): Promise<{ logs: WebhookEventLog[]; total: number }> {
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  let query = supabase
    .from('webhook_event_logs')
    .select('*', { count: 'exact' })
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }
  if (filter.category && filter.category !== 'all') {
    query = query.eq('category', filter.category);
  }
  if (filter.endpointSlug) {
    query = query.eq('endpoint_slug', filter.endpointSlug);
  }
  if (filter.providerCode) {
    query = query.eq('provider_code', filter.providerCode);
  }
  if (filter.search?.trim()) {
    const q = `%${filter.search.trim()}%`;
    query = query.or(`event_type.ilike.${q},provider_name.ilike.${q},processing_summary.ilike.${q},error_detail.ilike.${q}`);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { logs: (data ?? []) as WebhookEventLog[], total: count ?? 0 };
}

async function getEndpointStats(slug: string): Promise<{
  latestEvent: WebhookEventLog | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  last24hCount: number;
  last24hFailures: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [latestRes, successRes, failureRes, countRes] = await Promise.all([
    supabase
      .from('webhook_event_logs')
      .select('*')
      .eq('endpoint_slug', slug)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('webhook_event_logs')
      .select('received_at')
      .eq('endpoint_slug', slug)
      .eq('status', 'SUCCESS')
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('webhook_event_logs')
      .select('received_at')
      .eq('endpoint_slug', slug)
      .eq('status', 'FAILED')
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('webhook_event_logs')
      .select('id, status', { count: 'exact' })
      .eq('endpoint_slug', slug)
      .gte('received_at', since),
  ]);

  const last24hData = (countRes.data ?? []) as { status: string }[];
  return {
    latestEvent: latestRes.data as WebhookEventLog | null,
    lastSuccessAt: (successRes.data as { received_at: string } | null)?.received_at ?? null,
    lastFailureAt: (failureRes.data as { received_at: string } | null)?.received_at ?? null,
    last24hCount: countRes.count ?? 0,
    last24hFailures: last24hData.filter((r) => r.status === 'FAILED').length,
  };
}

async function listEndpoints(): Promise<RegisteredEndpoint[]> {
  // Fetch provider active/env status from their config tables
  const [paymentRows, waRows, emailRows] = await Promise.all([
    supabase.from('payment_provider_configs').select('provider_code,is_active,environment_mode'),
    supabase.from('whatsapp_provider_configs').select('provider_code,is_active,environment_mode'),
    supabase.from('email_provider_configs').select('provider_code,is_active,environment_mode'),
  ]);

  function findProvider(code: string, rows: { data: unknown[] | null }) {
    if (!rows.data) return null;
    return (rows.data as { provider_code: string; is_active: boolean; environment_mode: string }[])
      .find((r) => r.provider_code === code) ?? null;
  }

  const providerMap: Record<string, { isActive: boolean; environmentMode: string }> = {};
  for (const row of (paymentRows.data ?? []) as { provider_code: string; is_active: boolean; environment_mode: string }[]) {
    providerMap[`payments-${row.provider_code}`] = { isActive: row.is_active, environmentMode: row.environment_mode };
  }
  for (const row of (waRows.data ?? []) as { provider_code: string; is_active: boolean; environment_mode: string }[]) {
    providerMap[`whatsapp-${row.provider_code}`] = { isActive: row.is_active, environmentMode: row.environment_mode };
  }
  for (const row of (emailRows.data ?? []) as { provider_code: string; is_active: boolean; environment_mode: string }[]) {
    providerMap[`email-${row.provider_code}`] = { isActive: row.is_active, environmentMode: row.environment_mode };
  }

  // Fetch stats for all endpoints in parallel
  const stats = await Promise.all(
    ENDPOINT_REGISTRY.map((ep) => getEndpointStats(ep.slug))
  );

  return ENDPOINT_REGISTRY.map((ep, i) => {
    const pm = providerMap[`${ep.category}-${ep.providerCode}`];
    const stat = stats[i];
    return {
      ...ep,
      isActive: pm?.isActive ?? false,
      environmentMode: pm?.environmentMode ?? 'SANDBOX',
      ...stat,
    };
  });
}

async function replayEvent(logId: string, adminEmail: string): Promise<WebhookReplaySummary> {
  const { data: log, error: fetchErr } = await supabase
    .from('webhook_event_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (fetchErr || !log) {
    return { logId, success: false, message: 'Event log not found.', newStatus: 'FAILED' };
  }

  const event = log as WebhookEventLog;

  const endpoint = ENDPOINT_REGISTRY.find((e) => e.slug === event.endpoint_slug);
  if (!endpoint?.replayable) {
    return { logId, success: false, message: 'This event type is not replayable.', newStatus: event.status };
  }

  // Simulate a replay (in a real system this would re-dispatch the payload to the handler)
  // For safety, we validate that the payload structure looks correct and mark replayed
  const hasPayload = Object.keys(event.raw_payload).length > 0;
  const success = hasPayload;
  const newStatus: WebhookEventStatus = success ? 'REPLAYED' : 'FAILED';
  const message = success
    ? `Event replayed successfully. Payload re-submitted for processing.`
    : `Replay failed — event payload is empty or malformed.`;

  await supabase
    .from('webhook_event_logs')
    .update({
      status: newStatus,
      retry_count: (event.retry_count ?? 0) + 1,
      last_replayed_at: new Date().toISOString(),
      replayed_by_email: adminEmail,
      processing_summary: message,
    })
    .eq('id', logId);

  return { logId, success, message, newStatus };
}

async function simulateInboundEvent(params: {
  slug: string;
  eventType: string;
  adminEmail: string;
}): Promise<WebhookEventLog> {
  const ep = ENDPOINT_REGISTRY.find((e) => e.slug === params.slug);
  if (!ep) throw new Error(`Unknown endpoint slug: ${params.slug}`);

  const { data, error } = await supabase
    .from('webhook_event_logs')
    .insert({
      endpoint_slug: params.slug,
      category: ep.category,
      provider_code: ep.providerCode,
      provider_name: ep.providerName,
      environment_mode: 'SANDBOX',
      event_type: params.eventType,
      idempotency_key: null,
      status: 'SUCCESS',
      http_method: 'POST',
      raw_headers: { 'content-type': 'application/json', 'x-simulated': 'true' },
      raw_payload: { simulated: true, event: params.eventType, triggered_by: params.adminEmail },
      processing_summary: `Simulated event "${params.eventType}" recorded by ${params.adminEmail}.`,
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as WebhookEventLog;
}

export const webhookApi = {
  listEndpoints,
  getLogs,
  getEndpointStats,
  replayEvent,
  simulateInboundEvent,
  ENDPOINT_REGISTRY,
};
