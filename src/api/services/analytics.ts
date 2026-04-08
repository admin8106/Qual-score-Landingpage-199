/**
 * Analytics service — lightweight event tracking.
 *
 * Events are logged to the backend (which persists to Supabase analytics_events table).
 * All calls are fire-and-forget — failures are silently ignored to never block the user.
 *
 * Event names follow snake_case convention matching the backend enum.
 * Add new event types to AnalyticsEventName as the product grows.
 */

import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';

export type AnalyticsEventName =
  | 'landing_page_view'
  | 'cta_clicked'
  | 'payment_started'
  | 'payment_success'
  | 'payment_failed'
  | 'profile_form_completed'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'analysis_started'
  | 'report_generated'
  | 'report_viewed'
  | 'consultation_cta_clicked'
  | 'consultation_booked';

export interface LogAnalyticsEventRequest {
  eventName: AnalyticsEventName;
  candidateCode?: string;
  sessionId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface LogAnalyticsEventResponse {
  logged: boolean;
}

const BASE = '/api/v1/analytics';

async function trackEvent(request: LogAnalyticsEventRequest): Promise<ApiResult<LogAnalyticsEventResponse>> {
  return httpClient.post<LogAnalyticsEventResponse>(`${BASE}/events`, request);
}

export const analyticsApi = {
  track: trackEvent,

  fire(eventName: AnalyticsEventName, candidateCode?: string, metadata?: LogAnalyticsEventRequest['metadata']): void {
    trackEvent({ eventName, candidateCode, metadata }).catch(() => {});
  },
};
