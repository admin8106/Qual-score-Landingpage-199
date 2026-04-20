/**
 * Unified analytics service.
 *
 * This is the single entry point for all event tracking in the app.
 * It fans out to:
 *   1. Backend event log  — via analyticsApi (persisted to DB for funnel reporting)
 *   2. GA4               — stub, activate by adding gtag script to index.html
 *   3. Mixpanel          — stub, activate via `npm install mixpanel-browser`
 *   4. Meta Pixel        — stub, activate by adding fbq base code to index.html
 *
 * All calls are fire-and-forget — failures are silently swallowed so analytics
 * never blocks or breaks the user journey.
 *
 * ─── Adding a new provider ────────────────────────────────────────────────────
 * 1. Add a `forwardToXxx()` function below the "External provider stubs" block.
 * 2. Call it inside `track()`.
 * 3. Document the activation steps in the stub comment.
 *
 * ─── Adding a new event ───────────────────────────────────────────────────────
 * 1. Add the event name to AnalyticsEventName (also update src/api/services/analytics.ts).
 * 2. Add a typed convenience method to the `Analytics` namespace at the bottom.
 * 3. Fire it from the relevant page component.
 */

import { analyticsApi, type AnalyticsEventName } from '../api/services/analytics';
import { supabase } from '../lib/supabase';

// ─── Property bag ─────────────────────────────────────────────────────────────

export type { AnalyticsEventName };

export interface AnalyticsEventProperties {
  candidateCode?: string | null;
  sessionId?: string | null;
  page?: string;
  score?: number;
  band?: string;
  paymentRef?: string | null;
  bookingRef?: string | null;
  source?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// ─── Anonymous session identity ───────────────────────────────────────────────
// A stable per-browser ID so events can be stitched together before a
// candidateCode is known (e.g. landing → checkout).

const ANON_KEY = 'qs_anon_id';

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'anon_unknown';
  }
}

// ─── In-memory deduplication ──────────────────────────────────────────────────
// Prevents the same logical event being fired more than once per page session
// when a component re-renders or a strict-mode double-effect fires.

const _fired = new Set<string>();

function dedupKey(name: AnalyticsEventName, candidateCode?: string | null): string {
  return `${name}:${candidateCode ?? getAnonId()}`;
}

const FIRED_SIZE_LIMIT = 500;
function maybePruneDedup(): void {
  if (_fired.size > FIRED_SIZE_LIMIT) _fired.clear();
}

// ─── Core track function ──────────────────────────────────────────────────────

export function track(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
  opts: { deduplicate?: boolean } = {},
): void {
  if (opts.deduplicate) {
    const key = dedupKey(name, properties.candidateCode);
    if (_fired.has(key)) return;
    maybePruneDedup();
    _fired.add(key);
  }

  const timestamp = new Date().toISOString();

  if (import.meta.env.DEV) {
    console.debug(`[Analytics] ${name}`, { ...properties, _anonId: getAnonId(), _ts: timestamp });
  }

  // 1. Supabase direct write (primary — works even if Java backend is down)
  const props: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (v != null && k !== 'candidateCode' && k !== 'sessionId') {
      props[k] = v as string | number | boolean;
    }
  }
  supabase
    .from('analytics_events')
    .insert({
      event_name: name,
      anonymous_id: getAnonId(),
      properties: Object.keys(props).length > 0 ? props : undefined,
      occurred_at: timestamp,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[Analytics] Supabase event write failed:', error.message);
      }
    });

  // 2. Backend event log (secondary — best-effort, may fail if backend is down)
  const backendProps: Record<string, string | number | boolean> = { ...props };
  if (properties.candidateCode) backendProps['candidateCode'] = properties.candidateCode;

  analyticsApi.fire(
    name,
    getAnonId(),
    timestamp,
    Object.keys(backendProps).length > 0 ? backendProps : undefined,
  );

  // 2–4. External adapters
  forwardToGA4(name, properties);
  forwardToMixpanel(name, properties);
  forwardToMetaPixel(name, properties);
}

// ─── External provider stubs ──────────────────────────────────────────────────

/*
  GA4 INTEGRATION
  ───────────────
  Activation steps:
  1. Add the GA4 script to index.html:
       <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
       <script>
         window.dataLayer = window.dataLayer || [];
         function gtag(){ dataLayer.push(arguments); }
         gtag('js', new Date());
         gtag('config', 'G-XXXXXXXXXX');
       </script>
  2. No code change needed here — forwardToGA4 detects `window.gtag` automatically.

  Recommended event mapping:
    landing_page_view   → GA4 page_view  (handled automatically by gtag config)
    payment_started     → GA4 begin_checkout
    payment_success     → GA4 purchase  (value: 199, currency: 'INR')
    consultation_booked → GA4 generate_lead
*/
function forwardToGA4(name: AnalyticsEventName, properties: AnalyticsEventProperties): void {
  if (typeof window === 'undefined' || !('gtag' in window)) return;
  const ga4Map: Partial<Record<AnalyticsEventName, string>> = {
    payment_started:     'begin_checkout',
    payment_success:     'purchase',
    consultation_booked: 'generate_lead',
  };
  const ga4Name = ga4Map[name] ?? name;
  const params: Record<string, unknown> = { event_category: 'funnel', ...properties };
  if (name === 'payment_success') {
    params['value']    = 199;
    params['currency'] = 'INR';
  }
  (window as Window & { gtag: Function }).gtag('event', ga4Name, params);
}

/*
  MIXPANEL INTEGRATION
  ─────────────────────
  Activation steps:
  1. npm install mixpanel-browser
  2. In main.tsx: import mixpanel from 'mixpanel-browser'; mixpanel.init('YOUR_TOKEN');
  3. No code change needed here — forwardToMixpanel detects `window.mixpanel` automatically.
*/
function forwardToMixpanel(name: AnalyticsEventName, properties: AnalyticsEventProperties): void {
  if (typeof window === 'undefined' || !('mixpanel' in window)) return;
  (window as Window & { mixpanel: { track: Function } }).mixpanel.track(name, properties);
}

/*
  META PIXEL INTEGRATION
  ───────────────────────
  Activation steps:
  1. Add Meta Pixel base code to index.html with your pixel ID.
  2. No code change needed here — forwardToMetaPixel detects `window.fbq` automatically.

  Standard event mapping used below:
    landing_page_view   → ViewContent
    payment_started     → InitiateCheckout
    payment_success     → Purchase  (value: 199, currency: INR)
    consultation_booked → Lead
*/
function forwardToMetaPixel(name: AnalyticsEventName, properties: AnalyticsEventProperties): void {
  if (typeof window === 'undefined' || !('fbq' in window)) return;
  const fbq = (window as Window & { fbq: Function }).fbq;
  const metaMap: Partial<Record<AnalyticsEventName, string>> = {
    landing_page_view:   'ViewContent',
    payment_started:     'InitiateCheckout',
    payment_success:     'Purchase',
    consultation_booked: 'Lead',
  };
  const mapped = metaMap[name];
  if (!mapped) return;
  const fbProps = name === 'payment_success'
    ? { value: 199, currency: 'INR', ...properties }
    : properties;
  fbq('track', mapped, fbProps);
}

// ─── Convenience named trackers ───────────────────────────────────────────────
// Use these in page components — never call `track()` directly from pages.
// Each method is intentionally typed so callers pass the right metadata.

export const Analytics = {
  landingPageView(): void {
    track('landing_page_view', { page: '/' }, { deduplicate: true });
  },

  ctaClicked(source: string): void {
    track('cta_clicked', { source, page: '/' });
  },

  paymentStarted(): void {
    track('payment_started', { page: '/checkout' });
  },

  paymentSuccess(paymentRef: string): void {
    track('payment_success', { paymentRef, page: '/checkout' });
  },

  profileFormCompleted(candidateCode: string): void {
    track('profile_form_completed', { candidateCode, page: '/details' });
  },

  diagnosticStarted(candidateCode: string): void {
    track(
      'diagnostic_started',
      { candidateCode, page: '/diagnostic' },
      { deduplicate: true },
    );
  },

  diagnosticCompleted(candidateCode: string): void {
    track('diagnostic_completed', { candidateCode, page: '/diagnostic' });
  },

  analysisStarted(candidateCode: string): void {
    track('analysis_started', { candidateCode, page: '/analysis' });
  },

  reportGeneratedViewed(candidateCode: string, score: number, band: string): void {
    track('report_generated', { candidateCode, score, band, page: '/report' }, { deduplicate: true });
  },

  reportViewed(candidateCode: string): void {
    track('report_viewed', { candidateCode, page: '/report' }, { deduplicate: true });
  },

  consultationCtaClicked(source: string, candidateCode?: string | null): void {
    track('consultation_cta_clicked', { source, candidateCode: candidateCode ?? undefined, page: '/report' });
  },

  consultationBooked(bookingRef: string, candidateCode: string): void {
    track('consultation_booked', { bookingRef, candidateCode, page: '/booking' });
  },
};
