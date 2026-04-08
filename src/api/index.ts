/**
 * API layer — public surface.
 *
 * Import everything from here, not from sub-modules directly:
 *   import { paymentsApi, candidatesApi, diagnosticApi } from '@/api';
 *   import type { ApiResult, ApiError } from '@/api';
 *
 * To add a new domain:
 *   1. Create src/api/services/myDomain.ts
 *   2. Export the api object from that file
 *   3. Re-export it here
 */

export { httpClient } from './httpClient';

export type {
  ApiResult,
  ApiError,
  ValidationFieldError,
  RequestOptions,
  PaginatedResponse,
} from './types';

export { ok, err, isOk, isErr } from './types';

export { paymentsApi } from './services/payments';
export type { InitiatePaymentRequest, InitiatePaymentResponse, VerifyPaymentRequest, VerifyPaymentResponse } from './services/payments';

export { candidatesApi } from './services/candidates';
export type { CreateCandidateProfileRequest, CreateCandidateProfileResponse, CareerStage } from './services/candidates';

export { diagnosticApi, mapBackendQuestions, getFallbackQuestions, ANALYSIS_TERMINAL_STATES } from './services/diagnostic';
export type {
  BackendDiagnosticQuestion,
  BackendQuestionOption,
  UiQuestion,
  UiQuestionOption,
  UiSection,
  MappedQuestions,
  TriggerAnalysisRequest,
  TriggerAnalysisResponse,
  AnalysisStatus,
} from './services/diagnostic';

export { reportsApi } from './services/reports';
export type {
  DiagnosticReport,
  ReportStatus,
  ScoreSummary,
  DimensionScore,
  CtaBlock,
} from './services/reports';

export { consultationsApi } from './services/consultations';
export type {
  BookConsultationRequest,
  BookConsultationResponse,
  ConsultationSummary,
} from './services/consultations';

export { adminApi } from './services/admin';
export type {
  FetchLeadsParams,
  AdminLeadRecord,
  AdminLeadDetail,
  LeadFilter,
} from './services/admin';

export { analyticsApi } from './services/analytics';
export type {
  AnalyticsEventName,
  LogAnalyticsEventRequest,
  LogAnalyticsEventResponse,
} from './services/analytics';
