/**
 * ─────────────────────────────────────────────────────────────────────────────
 * QUALSCORE — API CLIENT  (bridge module)
 *
 * This file is kept for backward compatibility with pages that were built
 * against the original `client.ts` surface. It re-exports everything from
 * the new, modular API layer so existing imports continue to work unchanged.
 *
 * ─── New code should import directly from the service modules ────────────────
 *
 *   import { paymentsApi }     from '../api/services/payments';
 *   import { candidatesApi }   from '../api/services/candidates';
 *   import { diagnosticApi }   from '../api/services/diagnostic';
 *   import { reportsApi }      from '../api/services/reports';
 *   import { consultationsApi } from '../api/services/consultations';
 *   import { adminApi }        from '../api/services/admin';
 *   import { analyticsApi }    from '../api/services/analytics';
 *
 *   — or use the barrel —
 *
 *   import { paymentsApi, diagnosticApi } from '../api';
 *
 * ─── Where things live now ───────────────────────────────────────────────────
 *   HTTP client:   src/api/httpClient.ts
 *   Response types:src/api/types.ts
 *   Contracts:     src/api/contracts.ts  (DTO shapes — unchanged)
 *   Service calls: src/api/services/*.ts  (one file per domain)
 *   Hooks:         src/hooks/useAsync.ts, usePolling.ts, useApiError.ts
 *   Env config:    src/config/env.ts
 *
 * ─── Migrating a page ────────────────────────────────────────────────────────
 *   1. Replace `backendXxx()` calls with the matching `xxxApi.method()` call
 *   2. Replace `apiXxx()` legacy stubs with `xxxApi.method()` calls
 *   3. Use `useAsync(fn)` hook instead of manual useState loading patterns
 *   4. Once a page is migrated, remove its old imports from here
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ApiResult as _ApiResult } from './types';
import { paymentsApi }      from './services/payments';
import { candidatesApi }    from './services/candidates';
import { diagnosticApi }    from './services/diagnostic';
import { reportsApi }       from './services/reports';
import { consultationsApi } from './services/consultations';
import { adminApi }         from './services/admin';
import { analyticsApi }     from './services/analytics';

import { initiatePayment, verifyPayment } from '../services/paymentService';
import {
  createLead,
  createDiagnosticSession,
  saveDiagnosticResults,
  saveReport,
  saveEvaluation,
  fetchAdminLeads,
} from '../services/supabaseService';
import { submitConsultationBooking } from '../services/bookingService';
import { fetchLinkedInProfileAnalysis } from '../services/linkedinService';
import { runScoringEngine } from '../utils/scoringEngine';
import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import type { ScoreBand } from '../types';

import type {
  ApiResponse,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  SaveCandidateProfileRequest,
  SaveCandidateProfileResponse,
  DiagnosticQuestion,
  SubmitDiagnosticRequest,
  SubmitDiagnosticResponse,
  TriggerAnalysisRequest,
  TriggerAnalysisResponse,
  FetchReportResponse,
  BookConsultationRequest,
  BookConsultationResponse,
  FetchConsultationsResponse,
  FetchAdminLeadsRequest,
  FetchAdminLeadsResponse,
  LogAnalyticsEventRequest,
  LogAnalyticsEventResponse,
  SaveDiagnosticResponsesRequest,
  SaveDiagnosticResponsesResponse,
  CalculateDiagnosticResultRequest,
  CalculateDiagnosticResultResponse,
  AnalyzeLinkedInProfileRequest,
  AnalyzeLinkedInProfileResponse,
  GenerateReportRequest,
  GenerateReportResponse,
  BookConsultationRequestLegacy,
  BookConsultationResponseLegacy,
  FetchAdminLeadsRequestLegacy,
  FetchAdminLeadsResponseLegacy,
  LogCommEventRequest,
  LogCommEventResponse,
  PushLeadToCRMRequest,
  PushLeadToCRMResponse,
  FetchAnalyticsRequest,
  FetchAnalyticsResponse,
} from './contracts';

async function wrap<T>(fn: () => Promise<T>, errorCode = 'UNKNOWN_ERROR'): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { code: errorCode, message } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER A — REAL BACKEND FUNCTIONS  (delegates to new service modules)
// ─────────────────────────────────────────────────────────────────────────────

export async function backendInitiatePayment(
  req: InitiatePaymentRequest
): Promise<ApiResponse<InitiatePaymentResponse>> {
  const result = await paymentsApi.initiate({
    candidateName: (req as unknown as { candidateName?: string }).candidateName ?? '',
    email: (req as unknown as { email?: string }).email ?? '',
    mobileNumber: (req as unknown as { mobileNumber?: string }).mobileNumber,
    amountPaise: (req as unknown as { amountPaise?: number }).amountPaise ?? 0,
  });
  if (result.ok) return { ok: true, data: result.data as unknown as InitiatePaymentResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendVerifyPayment(
  req: VerifyPaymentRequest
): Promise<ApiResponse<VerifyPaymentResponse>> {
  const result = await paymentsApi.verify({
    gatewayOrderId: (req as unknown as { gatewayOrderId: string }).gatewayOrderId,
    gatewayPaymentId: (req as unknown as { gatewayPaymentId: string }).gatewayPaymentId,
    gatewaySignature: (req as unknown as { gatewaySignature: string }).gatewaySignature,
  });
  if (result.ok) return { ok: true, data: result.data as unknown as VerifyPaymentResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendSaveCandidateProfile(
  req: SaveCandidateProfileRequest
): Promise<ApiResponse<SaveCandidateProfileResponse>> {
  const result = await candidatesApi.createProfile(req as unknown as import('./services/candidates').CreateCandidateProfileRequest);
  if (result.ok) return { ok: true, data: result.data as unknown as SaveCandidateProfileResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendGetDiagnosticQuestions(): Promise<ApiResponse<DiagnosticQuestion[]>> {
  const result = await diagnosticApi.getQuestions();
  if (result.ok) return { ok: true, data: result.data as unknown as DiagnosticQuestion[], requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendSubmitDiagnostic(
  req: SubmitDiagnosticRequest
): Promise<ApiResponse<SubmitDiagnosticResponse>> {
  const result = await diagnosticApi.submitAnswers(req as unknown as Parameters<typeof diagnosticApi.submitAnswers>[0]);
  if (result.ok) return { ok: true, data: result.data as unknown as SubmitDiagnosticResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendTriggerAnalysis(
  candidateReference: string,
  req: TriggerAnalysisRequest = {}
): Promise<ApiResponse<TriggerAnalysisResponse>> {
  const result = await diagnosticApi.triggerAnalysis({
    candidateCode: candidateReference,
    linkedinUrl: (req as unknown as { linkedinUrl?: string }).linkedinUrl,
  });
  if (result.ok) return { ok: true, data: result.data as unknown as TriggerAnalysisResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendFetchReport(
  candidateReference: string
): Promise<ApiResponse<FetchReportResponse>> {
  const result = await reportsApi.getReport(candidateReference);
  if (result.ok) return { ok: true, data: result.data as unknown as FetchReportResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendBookConsultation(
  req: BookConsultationRequest
): Promise<ApiResponse<BookConsultationResponse>> {
  const result = await consultationsApi.book(req as unknown as import('./services/consultations').BookConsultationRequest);
  if (result.ok) return { ok: true, data: result.data as unknown as BookConsultationResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendFetchConsultations(
  candidateReference: string
): Promise<ApiResponse<FetchConsultationsResponse>> {
  const result = await consultationsApi.listForCandidate(candidateReference);
  if (result.ok) return { ok: true, data: result.data as unknown as FetchConsultationsResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendFetchAdminLeads(
  req: FetchAdminLeadsRequest = {},
  adminToken: string
): Promise<ApiResponse<FetchAdminLeadsResponse>> {
  const result = await adminApi.getLeads(
    { filter: req.filter as import('./services/admin').LeadFilter, page: undefined, pageSize: req.limit, search: req.search },
    adminToken
  );
  if (result.ok) return { ok: true, data: result.data as unknown as FetchAdminLeadsResponse, requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

export async function backendFetchAdminLead(
  candidateReference: string,
  adminToken: string
): Promise<ApiResponse<FetchAdminLeadsResponse['leads'][0]>> {
  const result = await adminApi.getLead(candidateReference, adminToken);
  if (result.ok) return { ok: true, data: result.data as unknown as FetchAdminLeadsResponse['leads'][0], requestId: result.requestId };
  return { ok: false, error: result.error, requestId: result.requestId };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — LEGACY STUB FUNCTIONS  (preserved for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export async function apiInitiatePayment(
  req: { amount: number; currency: 'INR'; productName: string; description: string; receipt?: string }
): Promise<ApiResponse<{ orderId: string; amount: number; currency: string; keyId: string }>> {
  return wrap(async () => {
    const result = await initiatePayment({
      amountPaise: req.amount,
      currency: req.currency,
      productName: req.productName,
      description: req.description,
      prefill: { name: '', email: '', contact: '' },
    });

    if (!result.success || !result.orderId || !result.paymentId) {
      throw new Error(result.error ?? 'Payment initiation failed');
    }

    return {
      orderId: result.orderId,
      amount: req.amount,
      currency: req.currency,
      keyId: env.razorpayKeyId || 'MOCK_KEY',
    };
  }, 'PAYMENT_INITIATE_FAILED');
}

export async function apiVerifyPayment(
  req: { razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string; leadId?: string }
): Promise<ApiResponse<{ verified: boolean; paymentId: string; orderId: string; capturedAt: string }>> {
  return wrap(async () => {
    const result = await verifyPayment(req.razorpayPaymentId, req.razorpayOrderId, req.razorpaySignature);

    if (!result.verified) {
      throw new Error(result.error ?? 'Payment verification failed');
    }

    return {
      verified: true,
      paymentId: req.razorpayPaymentId,
      orderId: req.razorpayOrderId,
      capturedAt: new Date().toISOString(),
    };
  }, 'PAYMENT_VERIFY_FAILED');
}

export async function apiSaveCandidateProfile(
  req: { candidateDetails: import('../types').CandidateDetails; paymentRef: string; paymentOrderId: string; sessionId?: string }
): Promise<ApiResponse<{ leadId: string; sessionId: string; createdAt: string }>> {
  return wrap(async () => {
    const leadId = await createLead(req.candidateDetails);
    const sessionId = await createDiagnosticSession(leadId);
    return { leadId, sessionId, createdAt: new Date().toISOString() };
  }, 'SAVE_PROFILE_FAILED');
}

export async function apiSaveDiagnosticResponses(
  req: SaveDiagnosticResponsesRequest
): Promise<ApiResponse<SaveDiagnosticResponsesResponse>> {
  return wrap(async () => {
    await saveDiagnosticResults(req.sessionId, req.answers, 0, []);

    const breakdown = req.answers.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {});

    return {
      sessionId: req.sessionId,
      answersRecorded: req.answers.length,
      categoryBreakdown: breakdown as SaveDiagnosticResponsesResponse['categoryBreakdown'],
      savedAt: new Date().toISOString(),
    };
  }, 'SAVE_RESPONSES_FAILED');
}

export async function apiCalculateDiagnosticResult(
  req: CalculateDiagnosticResultRequest
): Promise<ApiResponse<CalculateDiagnosticResultResponse>> {
  return wrap(async () => {
    const evaluation = await runScoringEngine(req.answers, req.candidateDetails);
    await saveEvaluation(req.sessionId, req.leadId, evaluation);
    return { evaluation, computedAt: new Date().toISOString() };
  }, 'CALCULATE_SCORE_FAILED');
}

export async function apiAnalyzeLinkedInProfile(
  req: AnalyzeLinkedInProfileRequest
): Promise<ApiResponse<AnalyzeLinkedInProfileResponse>> {
  return wrap(async () => {
    const candidateDetails = {
      name: req.candidateName,
      email: '',
      phone: '',
      location: req.location,
      jobRole: req.jobRole,
      yearsExperience: req.yearsExperience,
      careerStage: '' as const,
      industry: req.industry,
      linkedinUrl: req.linkedinUrl,
    };

    const analysis = await fetchLinkedInProfileAnalysis(req.linkedinUrl, candidateDetails);
    return { analysis, isMock: analysis.isMock, analyzedAt: new Date().toISOString() };
  }, 'LINKEDIN_ANALYSIS_FAILED');
}

export async function apiGenerateReport(
  req: GenerateReportRequest
): Promise<ApiResponse<GenerateReportResponse>> {
  return wrap(async () => {
    const { generateReport } = await import('../utils/reportGenerator');
    const reportData = generateReport([], req.candidateDetails, req.leadId, req.sessionId);
    const reportId = await saveReport(req.sessionId, req.leadId, reportData);
    return { reportId, reportData, generatedAt: new Date().toISOString() };
  }, 'GENERATE_REPORT_FAILED');
}

export async function apiBookConsultation(
  req: BookConsultationRequestLegacy
): Promise<ApiResponse<BookConsultationResponseLegacy>> {
  return wrap(async () => {
    const result = await submitConsultationBooking({
      candidate: {
        name: req.candidateName,
        email: req.candidateEmail,
        phone: req.candidatePhone,
        location: '',
        jobRole: req.jobRole,
        yearsExperience: '',
        careerStage: '',
        industry: '',
        linkedinUrl: '',
      },
      evaluation: null,
      leadId: req.leadId,
      sessionId: req.sessionId,
      preferredDate: req.preferredDate,
      preferredTime: req.preferredTime,
      notes: req.notes,
    });

    return {
      bookingRef: result.bookingRef,
      confirmedDate: req.preferredDate,
      confirmedTime: req.preferredTime,
      meetingLink: undefined,
      calendarEventId: undefined,
      bookedAt: new Date().toISOString(),
    };
  }, 'BOOKING_FAILED');
}

export async function apiFetchAdminLeads(
  req: FetchAdminLeadsRequestLegacy
): Promise<ApiResponse<FetchAdminLeadsResponseLegacy>> {
  return wrap(async () => {
    const rawLeads = await fetchAdminLeads();

    const leads = rawLeads.map((l: Record<string, unknown>) => ({
      id: l.id as string,
      name: l.name as string,
      email: l.email as string,
      phone: l.phone as string,
      location: l.location as string,
      jobRole: l.job_role as string,
      yearsExperience: l.years_experience as string,
      careerStage: l.career_stage as string,
      industry: l.industry as string,
      linkedinUrl: l.linkedin_url as string,
      paymentStatus: l.payment_status as 'pending' | 'completed' | 'failed',
      finalEmployabilityScore: l.final_employability_score as number | undefined,
      scoreBand: l.score_band as ScoreBand | undefined,
      crmTags: l.crm_tags as import('../types').CrmTag[] | undefined,
      createdAt: l.created_at as string,
    }));

    const filtered = req.filter && req.filter !== 'all'
      ? leads.filter((l) => l.paymentStatus === req.filter)
      : leads;

    const offset = req.offset ?? 0;
    const limit = req.limit ?? 50;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      leads: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
      fetchedAt: new Date().toISOString(),
    };
  }, 'FETCH_LEADS_FAILED');
}

export async function apiFetchAnalytics(
  req: FetchAnalyticsRequest = {}
): Promise<ApiResponse<FetchAnalyticsResponse>> {
  return wrap(async () => {
    const { fetchAnalyticsDashboard } = await import('../services/analyticsStore');
    const dashboard = await fetchAnalyticsDashboard(req.daysBack ?? 30);

    return {
      eventCounts: dashboard.metrics as unknown as Record<string, number>,
      conversionRates: dashboard.rates as unknown as Record<string, number>,
      topCtaSources: dashboard.topCtaSources,
      dailySeries: dashboard.daily.map((d) => ({
        date: d.date,
        counts: {
          landing_page_view: d.landing_page_view,
          payment_success: d.payment_success,
          report_generated: d.report_generated,
          consultation_booked: d.consultation_booked,
        },
      })),
      fetchedAt: dashboard.fetchedAt,
    };
  }, 'FETCH_ANALYTICS_FAILED');
}

export async function apiLogCommEvent(
  req: LogCommEventRequest
): Promise<ApiResponse<LogCommEventResponse>> {
  return wrap(async () => {
    const { logCommEvent } = await import('../services/commEventStore');

    logCommEvent({
      trigger: req.trigger as Parameters<typeof logCommEvent>[0]['trigger'],
      channel: req.channel,
      recipient: req.recipient,
      templateName: req.templateName,
      subject: req.subject,
      previewBody: req.previewBody,
      status: req.status,
      note: req.note ?? '',
    });

    return {
      eventId: `evt_${Date.now().toString(36)}`,
      loggedAt: new Date().toISOString(),
    };
  }, 'LOG_COMM_EVENT_FAILED');
}

export async function apiPushLeadToCRM(
  _req: PushLeadToCRMRequest
): Promise<ApiResponse<PushLeadToCRMResponse>> {
  if (!env.features.crmSync) {
    return {
      ok: false,
      error: { code: 'CRM_DISABLED', message: 'CRM sync is not enabled. Set VITE_FF_CRM_SYNC=true to activate.' },
    };
  }
  return {
    ok: false,
    error: { code: 'CRM_NOT_IMPLEMENTED', message: 'CRM integration is pending backend implementation.' },
  };
}

export async function apiLogAnalyticsEvent(
  req: LogAnalyticsEventRequest
): Promise<ApiResponse<LogAnalyticsEventResponse>> {
  return wrap(async () => {
    const { data, error } = await supabase.from('analytics_events').insert({
      event_name: req.eventName,
      properties: req.properties,
      anonymous_id: req.anonymousId,
      occurred_at: req.occurredAt,
    }).select('id').maybeSingle();

    if (error && env.isDev) {
      console.warn('[apiClient] analytics event insert failed:', error.message);
    }

    return {
      eventId: (data as { id?: string } | null)?.id ?? `local_${Date.now().toString(36)}`,
      recorded: !error,
    };
  }, 'LOG_ANALYTICS_FAILED');
}

export {
  paymentsApi,
  candidatesApi,
  diagnosticApi,
  reportsApi,
  consultationsApi,
  adminApi,
  analyticsApi,
};
