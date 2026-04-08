/**
 * ─────────────────────────────────────────────────────────────────────────────
 * QUALSCORE — BACKEND API CONTRACTS
 *
 * This file is the authoritative type source for every HTTP call the frontend
 * makes to the Java Spring Boot backend (api.qualscore.in / localhost:8080).
 *
 * All types are derived directly from the Java backend DTOs under:
 *   backend/src/main/java/com/qualscore/qualcore/dto/request/
 *   backend/src/main/java/com/qualscore/qualcore/dto/response/
 *
 * BASE URL:   import.meta.env.VITE_API_BASE_URL  (e.g. http://localhost:8080)
 *
 * STRUCTURE:
 *   Section 1  — Shared envelope types (ApiResponse, ApiError)
 *   Section 2  — Payment API       POST /api/v1/payments/initiate|verify|webhook
 *   Section 3  — Candidate API     POST /api/v1/candidates/profile
 *   Section 4  — Diagnostic API    GET|POST /api/v1/diagnostic/questions|submit|analyze
 *   Section 5  — Report API        GET /api/v1/reports/{candidateReference}
 *   Section 6  — Consultation API  POST|GET /api/v1/consultations
 *   Section 7  — Admin API         GET /api/v1/admin/leads
 *   Section 8  — Analytics API     POST /api/v1/analytics/event (Supabase direct)
 *   Section 9  — Legacy domain types (kept for compatibility with service layer)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  CandidateDetails,
  DiagnosticAnswer,
  ReportData,
  FinalScore,
  LinkedInAnalysis,
  CrmTag,
  ScoreBand,
  ScoreLevel,
  QuestionCategory,
  CategoryScore,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Shared Envelope Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All Java backend responses are wrapped in ApiResponse<T>.
 *
 * Success:   { ok: true,  data: T }
 * Failure:   { ok: false, error: ApiError, requestId?: string }
 *
 * The `requestId` field echoes the X-Request-Id header — include it in
 * any bug reports so backend logs can be correlated.
 */
export type ApiResponse<T> =
  | { ok: true; data: T; requestId?: string }
  | { ok: false; error: ApiError; requestId?: string };

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | ValidationFieldError[];
}

/** Returned by backend for 400 validation failures (one entry per invalid field). */
export interface ValidationFieldError {
  field: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Payment API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/initiate
 *
 * Creates a payment order via the active gateway (Razorpay / PayU / Mock).
 * Returns the parameters needed to open the gateway checkout widget.
 *
 * Java DTO: PaymentInitiateRequest / PaymentInitiateResponse
 *
 * Frontend flow:
 *   1. Call initiatePayment() → { paymentReference, gatewayOrderId, keyId, amountPaise }
 *   2. Open Razorpay modal:  options.key = keyId, options.order_id = gatewayOrderId
 *   3. On modal success → call verifyPayment() with the callback IDs + signature
 *   4. On verified → store paymentReference in flow state and proceed to profile form
 */
export interface InitiatePaymentRequest {
  candidateName: string;
  email: string;
  amountPaise: number;
  currency?: string;
  notes?: string;
}

export interface InitiatePaymentResponse {
  paymentReference: string;
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  createdAt: string;
}

/**
 * POST /api/v1/payments/verify
 *
 * Verifies the HMAC signature returned by the gateway after the checkout widget
 * reports success. Must be called immediately after the gateway success callback.
 *
 * Java DTO: PaymentVerifyRequest / PaymentVerifyResponse
 *
 * On success: verified=true + paymentReference → store and proceed to profile form.
 * On failure: verified=false → show payment failure screen, do NOT proceed.
 */
export interface VerifyPaymentRequest {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  paymentReference: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  status: 'VERIFIED' | 'SUCCESS' | 'FAILED' | 'INITIATED';
  verifiedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Candidate Profile API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/candidates/profile  (HTTP 201 on success)
 *
 * Creates or updates a candidate profile. The paymentReference from Step 2 above
 * is required — the backend verifies payment before creating the profile.
 *
 * Java DTO: CreateCandidateProfileRequest / CreateCandidateProfileResponse
 *
 * On success: candidateCode is issued — this is the token used for ALL subsequent
 * calls (submit diagnostic, fetch report, book consultation).
 *
 * careerStage must be exactly: "FRESHER" or "WORKING_PROFESSIONAL"
 * mobileNumber must match: ^(\+91)?[6-9]\d{9}$
 * linkedinUrl  must match: https://www.linkedin.com/in/... (or be omitted)
 */
export interface SaveCandidateProfileRequest {
  fullName: string;
  email: string;
  mobileNumber: string;
  location: string;
  currentRole: string;
  careerStage: 'FRESHER' | 'WORKING_PROFESSIONAL';
  industry: string;
  linkedinUrl?: string;
  notes?: string;
  paymentReference: string;
}

export interface SaveCandidateProfileResponse {
  candidateCode: string;
  fullName: string;
  email: string;
  careerStage: 'FRESHER' | 'WORKING_PROFESSIONAL';
  industry: string;
  linkedinUrl?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Diagnostic API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/diagnostic/questions
 *
 * Returns all 15 diagnostic questions with options for frontend rendering.
 * NOTE: Option scores are NOT included — backend assigns authoritative scores.
 *
 * Java DTO: QuestionMasterResponse / QuestionOptionResponse
 */
export interface DiagnosticQuestion {
  code: string;
  sequence: number;
  sectionCode: string;
  sectionLabel: string;
  text: string;
  options: DiagnosticOption[];
}

export interface DiagnosticOption {
  code: string;
  label: string;
}

/**
 * POST /api/v1/diagnostic/submit  (alias: POST /api/v1/diagnostic/responses)
 *
 * Submits all 15 answers. The backend validates option codes against the catalog
 * and assigns authoritative scores — frontend-submitted scores are ignored.
 *
 * Java DTO: DiagnosticSubmitRequest
 *
 * answers[].questionCode — must match the code from GET /questions (Q01–Q15)
 * answers[].optionCode   — must match one of the option codes for that question
 *
 * On success: returns sessionId + answersRecorded count.
 */
export interface SubmitDiagnosticRequest {
  candidateCode: string;
  answers: DiagnosticAnswerSubmit[];
}

export interface DiagnosticAnswerSubmit {
  questionCode: string;
  optionCode: string;
}

export interface SubmitDiagnosticResponse {
  sessionId: string;
  answersRecorded: number;
  savedAt: string;
}

/**
 * POST /api/v1/diagnostic/analyze/{candidateReference}
 *
 * Triggers the full analysis pipeline:
 *   1. Fetch saved responses
 *   2. Score via canonical catalog (section scores + weighted final)
 *   3. LinkedIn analysis (Proxycurl + LLM or rule-based fallback)
 *   4. Compute final employability score + band + CRM tags
 *   5. Persist diagnostic score record
 *   6. Generate AI/rule-based report
 *
 * Java DTO: DiagnosticAnalysisTriggerRequest / DiagnosticAnalysisResponse
 *
 * forceRecalculate=true is required to re-run if analysis already exists.
 */
export interface TriggerAnalysisRequest {
  forceRecalculate?: boolean;
}

export interface TriggerAnalysisResponse {
  candidateCode: string;
  careerDirectionScore: number;
  jobSearchBehaviorScore: number;
  opportunityReadinessScore: number;
  flexibilityConstraintsScore: number;
  improvementIntentScore: number;
  linkedinScore: number;
  finalEmployabilityScore: number;
  bandLabel: string;
  tags: string[];
  reportGenerated: boolean;
  linkedinAnalyzed: boolean;
  isMockLinkedIn: boolean;
  analyzedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Report API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/reports/{candidateReference}
 *
 * Returns the latest generated diagnostic report for the candidate.
 * Requires that /diagnostic/analyze has been called first.
 *
 * Java DTO: DiagnosticReportResponse
 *
 * scoreSummary and dimensionBreakdown are typed as unknown/object because
 * the backend serialises them as jsonb — parse as needed.
 *
 * reportStatus values: PENDING | GENERATING | COMPLETED | FAILED
 */
export interface FetchReportResponse {
  id: string;
  candidateCode: string;
  reportTitle: string;
  scoreSummary: ReportScoreSummary | null;
  linkedinInsight: string | null;
  behavioralInsight: string | null;
  dimensionBreakdown: DimensionBreakdown[] | null;
  topGaps: ReportGap[] | null;
  riskProjection: string | null;
  recommendation: string | null;
  recruiterViewInsight: string | null;
  ctaHeadline: string | null;
  ctaBody: string | null;
  ctaButtonText: string | null;
  reportStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface ReportScoreSummary {
  finalEmployabilityScore: number;
  bandLabel: string;
  bandColor?: string;
  percentile?: number;
}

export interface DimensionBreakdown {
  sectionCode: string;
  sectionLabel: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ReportGap {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Consultation API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/consultations  (HTTP 201 on success)
 *
 * Books a consultation slot. candidateReference is the candidateCode from Step 3.
 * preferredDate must be YYYY-MM-DD format.
 * preferredTime is a free-text slot string, e.g. "10:00 AM" or "14:00".
 *
 * Java DTO: CreateConsultationRequest / ConsultationResponse
 *
 * Duplicate REQUESTED bookings for the same candidate are blocked (409).
 */
export interface BookConsultationRequest {
  candidateReference: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

export interface BookConsultationResponse {
  bookingId: string;
  candidateReference: string;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  bookingStatus: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/v1/consultations/{candidateReference}
 *
 * Returns all bookings for the candidate, most recent first.
 * Java DTO: ConsultationListResponse
 */
export interface FetchConsultationsResponse {
  candidateReference: string;
  bookings: BookConsultationResponse[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — Admin API  (requires Bearer JWT with ROLE_ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/leads?limit=50&offset=0&filter=all&search=
 *
 * filter values: "all" | "high" | "medium" | "reported" | "booked"
 * search: free text matched against fullName, email, mobileNumber, candidateCode
 *
 * Java DTO: AdminLeadV1ListResponse / AdminLeadV1Record
 */
export interface FetchAdminLeadsRequest {
  limit?: number;
  offset?: number;
  filter?: 'all' | 'high' | 'medium' | 'reported' | 'booked';
  search?: string;
}

export interface FetchAdminLeadsResponse {
  leads: AdminLeadRecord[];
  total: number;
  hasMore: boolean;
  fetchedAt: string;
}

export interface AdminLeadRecord {
  candidateReference: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  currentRole: string;
  totalExperienceYears: string | null;
  careerStage: 'FRESHER' | 'WORKING_PROFESSIONAL' | null;
  industry: string | null;
  linkedinUrl: string | null;
  finalEmployabilityScore: number | null;
  bandLabel: string | null;
  tags: string[];
  leadPriority: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  consultationStatus: string | null;
  paymentStatus: string | null;
  reportStatus: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Analytics API (Supabase direct — no backend proxy needed)
// ─────────────────────────────────────────────────────────────────────────────

export interface LogAnalyticsEventRequest {
  eventName: string;
  properties: Record<string, unknown>;
  anonymousId: string;
  occurredAt: string;
}

export interface LogAnalyticsEventResponse {
  eventId: string;
  recorded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — Legacy / Service-layer compatible types
//
// These types are kept for backward compatibility with existing pages and
// services that have not yet been migrated to the v1 backend API.
// They bridge the old frontend-only data model with the new backend contracts.
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy payment request shape (used by existing service stubs) */
export interface InitiatePaymentRequestLegacy {
  amount: number;
  currency: 'INR';
  productName: string;
  description: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface InitiatePaymentResponseLegacy {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/** Legacy verify payment request (used by existing service stubs) */
export interface VerifyPaymentRequestLegacy {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  leadId?: string;
}

export interface VerifyPaymentResponseLegacy {
  verified: boolean;
  paymentId: string;
  orderId: string;
  capturedAt: string;
}

/** Legacy profile save (Supabase direct write via supabaseService) */
export interface SaveCandidateProfileRequestLegacy {
  candidateDetails: CandidateDetails;
  paymentRef: string;
  paymentOrderId: string;
  sessionId?: string;
}

export interface SaveCandidateProfileResponseLegacy {
  leadId: string;
  sessionId: string;
  createdAt: string;
}

/** Legacy diagnostic save (Supabase direct write) */
export interface SaveDiagnosticResponsesRequest {
  leadId: string;
  sessionId: string;
  answers: DiagnosticAnswer[];
  completedAt: string;
}

export interface SaveDiagnosticResponsesResponse {
  sessionId: string;
  answersRecorded: number;
  categoryBreakdown: Record<QuestionCategory, number>;
  savedAt: string;
}

/** Legacy calculate result (client-side scoring engine) */
export interface CalculateDiagnosticResultRequest {
  leadId: string;
  sessionId: string;
  answers: DiagnosticAnswer[];
  candidateDetails: CandidateDetails;
  linkedInAnalysis?: LinkedInAnalysis;
}

export interface CalculateDiagnosticResultResponse {
  evaluation: FinalScore;
  computedAt: string;
}

/** Legacy LinkedIn analysis (mock service) */
export interface AnalyzeLinkedInProfileRequest {
  linkedinUrl: string;
  candidateName: string;
  jobRole: string;
  industry: string;
  yearsExperience: string;
  location: string;
  leadId: string;
  sessionId: string;
}

export interface AnalyzeLinkedInProfileResponse {
  analysis: LinkedInAnalysis;
  isMock: boolean;
  analyzedAt: string;
}

/** Legacy report generation (rule-based, Supabase direct write) */
export interface GenerateReportRequest {
  leadId: string;
  sessionId: string;
  candidateDetails: CandidateDetails;
  evaluation: FinalScore;
}

export interface GenerateReportResponse {
  reportId: string;
  reportData: ReportData;
  generatedAt: string;
}

/** Legacy booking (Supabase direct write) */
export interface BookConsultationRequestLegacy {
  leadId: string;
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobRole: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  employabilityScore: number;
  scoreBand: ScoreBand;
}

export interface BookConsultationResponseLegacy {
  bookingRef: string;
  confirmedDate: string;
  confirmedTime: string;
  meetingLink?: string;
  calendarEventId?: string;
  bookedAt: string;
}

/** Legacy admin fetch (Supabase direct) */
export interface FetchAdminLeadsRequestLegacy {
  limit?: number;
  offset?: number;
  filter?: 'all' | 'completed' | 'pending' | 'high_priority';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FetchAdminLeadsResponseLegacy {
  leads: AdminLeadRecordLegacy[];
  total: number;
  hasMore: boolean;
  fetchedAt: string;
}

export interface AdminLeadRecordLegacy {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  jobRole: string;
  yearsExperience: string;
  careerStage: string;
  industry: string;
  linkedinUrl: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentRef?: string;
  finalEmployabilityScore?: number;
  scoreBand?: ScoreBand;
  scoreLevel?: ScoreLevel;
  crmTags?: CrmTag[];
  createdAt: string;
  diagnosticSession?: {
    id: string;
    status: 'in_progress' | 'completed';
    overallScore?: number;
    finalEmployabilityScore?: number;
    scoreBand?: ScoreBand;
    linkedInScore?: number;
    sectionScores?: Record<string, number>;
    crmTags?: CrmTag[];
    completedAt?: string;
  };
  consultation?: {
    bookingRef: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    bookedAt: string;
  };
}

/** Communication event logging (legacy) */
export interface LogCommEventRequest {
  trigger: string;
  channel: 'whatsapp' | 'email' | 'crm' | 'internal';
  recipient: string;
  templateName: string;
  subject?: string;
  previewBody: string;
  status: 'sent' | 'failed' | 'would_fire';
  leadId?: string;
  sessionId?: string;
  note?: string;
}

export interface LogCommEventResponse {
  eventId: string;
  loggedAt: string;
}

export interface PushLeadToCRMRequest {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  jobRole: string;
  industry: string;
  score: number;
  scoreBand: ScoreBand;
  crmTags: CrmTag[];
  reportLink?: string;
  bookingRef?: string;
  source: 'diagnostic_completed' | 'report_viewed' | 'consultation_booked';
}

export interface PushLeadToCRMResponse {
  crmContactId: string;
  action: 'created' | 'updated';
  syncedAt: string;
}

/** Full domain output shapes for future backend responses */
export interface ScoringOutput {
  leadId: string;
  sessionId: string;
  linkedInScore: number;
  sectionScores: {
    careerDirection: number;
    jobSearchBehavior: number;
    opportunityReadiness: number;
    flexibilityConstraints: number;
    improvementIntent: number;
  };
  finalEmployabilityScore: number;
  band: ScoreBand;
  bandLabel: string;
  tags: CrmTag[];
  computedAt: string;
}

export interface ReportOutput {
  reportId: string;
  leadId: string;
  sessionId: string;
  candidateName: string;
  overallScore: number;
  scoreLevel: ScoreLevel;
  scoreLabel: string;
  categoryScores: CategoryScore[];
  findings: Array<{
    type: 'critical' | 'warning' | 'positive';
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
  executiveSummary: string;
  linkedInNarrative: string;
  whatsappDigest: string;
  generatedAt: string;
  isAIGenerated: boolean;
}

/** Admin analytics (legacy Supabase direct) */
export interface FetchAnalyticsRequest {
  daysBack?: number;
}

export interface FetchAnalyticsResponse {
  eventCounts: Record<string, number>;
  conversionRates: Record<string, number>;
  topCtaSources: Array<{ source: string; count: number }>;
  dailySeries: Array<{
    date: string;
    counts: Record<string, number>;
  }>;
  fetchedAt: string;
}
