/**
 * Mock backend — Supabase-native implementation of all backend endpoints.
 *
 * Activated when VITE_OP_MOCK_PAYMENT=true (or set via QualScore.ops.set('mockPayment', true)).
 * Allows the full candidate funnel to run without the Java Spring Boot backend.
 *
 * All mock data is persisted to Supabase so the admin dashboard, analytics,
 * and ops panel all reflect real data.
 */

import { supabase } from '../../lib/supabase';
import { ok, err } from '../types';
import type { ApiResult } from '../types';
import type { InitiatePaymentResponse, VerifyPaymentResponse, PaymentStatusResponse } from './payments';
import type { CreateCandidateProfileResponse } from './candidates';
import type { SubmitDiagnosticResponse, TriggerAnalysisResponse, BackendDiagnosticQuestion } from './diagnostic';
import type { DiagnosticReport } from './reports';
import { runScoringEngine } from '../../utils/scoringEngine';
import type { CandidateDetails } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(len = 8): string {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function candidateCode(): string {
  return `CND-${nanoid(6)}`;
}

function paymentRef(): string {
  return `PAY-MOCK-${nanoid(10)}`;
}

function orderRef(): string {
  return `ORDER-MOCK-${nanoid(10)}`;
}

// ─── In-memory state (session-scoped) ─────────────────────────────────────────
// Keyed by paymentReference, then candidateCode.

const _pendingOrders = new Map<string, { paymentRef: string; amountPaise: number }>();
const _verifiedPayments = new Set<string>();
const _candidateAnswers = new Map<string, { questionCode: string; selectedOptionCode: string }[]>();
const _candidateDetails = new Map<string, CandidateDetails>();

// ─── Payment ──────────────────────────────────────────────────────────────────

export async function mockInitiatePayment(amountPaise: number): Promise<ApiResult<InitiatePaymentResponse>> {
  const ref   = paymentRef();
  const order = orderRef();
  _pendingOrders.set(order, { paymentRef: ref, amountPaise });

  try {
    await supabase.from('analytics_events').insert({
      event_name: 'payment_initiated',
      properties: { mock: true, amountPaise, ref },
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }

  return ok<InitiatePaymentResponse>({
    paymentReference: ref,
    gatewayOrderId:   order,
    keyId:            'mock_key',
    amountPaise,
    currency:         'INR',
    provider:         'MOCK',
    checkoutType:     'MOCK',
  });
}

export async function mockVerifyPayment(
  gatewayOrderId: string,
  _gatewayPaymentId: string,
  _gatewaySignature: string,
  paymentReference?: string,
): Promise<ApiResult<VerifyPaymentResponse>> {
  const ref = paymentReference ?? _pendingOrders.get(gatewayOrderId)?.paymentRef ?? gatewayOrderId;
  _verifiedPayments.add(ref);

  try {
    await supabase.from('analytics_events').insert({
      event_name: 'payment_success',
      properties: { mock: true, ref },
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }

  return ok<VerifyPaymentResponse>({
    verified:         true,
    paymentReference: ref,
    status:           'VERIFIED',
  });
}

export async function mockGetPaymentStatus(paymentReference: string): Promise<ApiResult<PaymentStatusResponse>> {
  const verified = _verifiedPayments.has(paymentReference);
  return ok<PaymentStatusResponse>({
    paymentReference,
    status:   verified ? 'VERIFIED' : 'INITIATED',
    verified,
    gatewayOrderId: undefined,
  });
}

// ─── Candidate profile ────────────────────────────────────────────────────────

export async function mockCreateCandidateProfile(request: {
  paymentReference: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  currentRole?: string;
  careerStage: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  totalExperienceYears?: string;
}): Promise<ApiResult<CreateCandidateProfileResponse>> {
  const code = candidateCode();

  const details: CandidateDetails = {
    name:               request.fullName,
    email:              request.email,
    phone:              request.mobileNumber ?? '',
    location:           request.location ?? '',
    jobRole:            request.currentRole ?? '',
    yearsExperience:    request.totalExperienceYears ?? '',
    careerStage:        (request.careerStage.toLowerCase() === 'fresher' ? 'fresher' : 'working_professional') as CandidateDetails['careerStage'],
    industry:           request.industry ?? '',
    linkedinUrl:        request.linkedinUrl ?? '',
    linkedinHeadline:   '',
    linkedinAboutText:  '',
    linkedinExperienceText: '',
    linkedinAchievements: '',
  };

  _candidateDetails.set(code, details);

  try {
    await supabase.from('candidate_profiles').insert({
      candidate_code:       code,
      full_name:            request.fullName,
      email:                request.email,
      mobile_number:        request.mobileNumber ?? null,
      current_role:         request.currentRole ?? null,
      career_stage:         request.careerStage,
      industry:             request.industry ?? null,
      location:             request.location ?? null,
      linkedin_url:         request.linkedinUrl ?? null,
      total_experience_years: request.totalExperienceYears ?? null,
      payment_reference:    request.paymentReference,
      payment_status:       'COMPLETED',
      report_status:        'PENDING',
    });
  } catch {
    // non-fatal — profile is still in memory for the rest of the flow
  }

  return ok<CreateCandidateProfileResponse>({
    candidateCode: code,
    fullName:      request.fullName,
    email:         request.email,
    careerStage:   request.careerStage as 'FRESHER' | 'WORKING_PROFESSIONAL',
  });
}

// ─── Diagnostic ───────────────────────────────────────────────────────────────

export async function mockSubmitAnswers(
  candidateCode: string,
  answers: { questionCode: string; selectedOptionCode: string }[],
): Promise<ApiResult<SubmitDiagnosticResponse>> {
  _candidateAnswers.set(candidateCode, answers);

  return ok<SubmitDiagnosticResponse>({
    sessionId:       `sess_mock_${candidateCode}`,
    answersReceived: answers.length,
    status:          'SUBMITTED',
  });
}

export async function mockTriggerAnalysis(
  code: string,
  linkedinUrl?: string,
): Promise<ApiResult<TriggerAnalysisResponse>> {
  const details  = _candidateDetails.get(code);
  const answers  = _candidateAnswers.get(code) ?? [];

  let score = 62;
  let bandLabel = 'Needs Optimization';

  if (details) {
    try {
      const mappedAnswers = answers.map((a) => ({
        questionCode:  a.questionCode,
        category:      a.questionCode.split('_')[0].toLowerCase(),
        selectedOption: a.selectedOptionCode,
        score:         2,
      }));

      const evaluation = await runScoringEngine(mappedAnswers, details);
      score     = evaluation.totalScore ?? score;
      bandLabel = evaluation.scoreBand  ?? bandLabel;

      await supabase.from('diagnostic_scores').insert({
        candidate_code:            code,
        final_employability_score: score,
        band_label:                bandLabel,
        score_breakdown:           evaluation.dimensionScores ?? {},
      }).select().maybeSingle();

      await supabase.from('diagnostic_reports').insert({
        candidate_code: code,
        report_status:  'COMPLETED',
        prompt_version: 'mock-v1',
        generated_at:   new Date().toISOString(),
      }).select().maybeSingle();

      await supabase.from('candidate_profiles')
        .update({
          report_status:             'COMPLETED',
          final_employability_score: score,
          band_label:                bandLabel,
          lead_priority:             score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
        })
        .eq('candidate_code', code);

    } catch {
      // fall back to default score
    }
  }

  await supabase.from('analytics_events').insert({
    event_name:  'report_generated',
    properties:  { mock: true, candidate_code: code, score, linkedinUrl },
    occurred_at: new Date().toISOString(),
  }).select().maybeSingle();

  return ok<TriggerAnalysisResponse>({
    candidateCode:           code,
    status:                  'COMPLETED',
    finalEmployabilityScore: score,
    bandLabel,
    reportStatus:            'COMPLETED',
  });
}

export async function mockGetReport(code: string): Promise<ApiResult<DiagnosticReport>> {
  const answers = _candidateAnswers.get(code) ?? [];
  const details = _candidateDetails.get(code);
  const score   = 62;

  let dimensionBreakdown = [
    { area: 'Career Direction',       score: 65, status: 'Needs Work',  remark: 'Your targeting clarity needs sharpening.' },
    { area: 'Job Search Behavior',    score: 58, status: 'Weak',        remark: 'Application volume and follow-up are below market pace.' },
    { area: 'Opportunity Readiness',  score: 70, status: 'Moderate',    remark: 'Interview prep is partial — strengthen proof of work.' },
    { area: 'Flexibility & Constraints', score: 75, status: 'Good',     remark: 'Good flexibility on location and setup.' },
    { area: 'Improvement Intent',     score: 55, status: 'Low',         remark: 'Low active investment in self-improvement signals.' },
  ];

  if (details && answers.length > 0) {
    try {
      const mappedAnswers = answers.map((a) => ({
        questionCode:   a.questionCode,
        category:       a.questionCode.split('_')[0].toLowerCase(),
        selectedOption: a.selectedOptionCode,
        score:          2,
      }));
      const evaluation = await runScoringEngine(mappedAnswers, details);
      if (evaluation.dimensionScores) {
        dimensionBreakdown = Object.entries(evaluation.dimensionScores).map(([area, s]) => ({
          area,
          score:  s as number,
          status: (s as number) >= 70 ? 'Good' : (s as number) >= 50 ? 'Moderate' : 'Needs Work',
          remark: (s as number) >= 70
            ? 'Above average in this area.'
            : (s as number) >= 50
              ? 'Some gaps — addressable with focused effort.'
              : 'Critical gap identified in this area.',
        }));
      }
    } catch {
      // use defaults
    }
  }

  return ok<DiagnosticReport>({
    candidateCode:    code,
    reportStatus:     'COMPLETED',
    reportTitle:      'Employability Diagnostic Report',
    scoreSummary: {
      employabilityScore: score,
      bandLabel:          'Needs Optimization',
      tagline:            'You have the experience, but gaps in positioning and search strategy are holding you back.',
    },
    linkedinInsight:    'Your LinkedIn profile is missing keyword density and measurable outcomes that recruiters filter for.',
    behavioralInsight:  'Application volume and follow-up consistency are below what active shortlisting requires.',
    dimensionBreakdown,
    topGaps: [
      'Profile not optimized for ATS keyword filtering',
      'Low application volume relative to target role competition',
      'Interview preparation is inconsistent and reactive',
    ],
    riskProjection:  'At your current pace, expect 2–4 more months without significant shortlisting progress.',
    recommendation:  'A focused 30-day profile and search strategy sprint will have the most impact. A career strategist session is recommended.',
    ctaBlock: {
      headline:   'Ready to fix what\'s blocking you?',
      body:       'Book a 1:1 career strategy session to get a personalised fix plan for your exact profile.',
      buttonText: 'Book My Strategy Session',
    },
    generatedAt: new Date().toISOString(),
  });
}

// ─── Questions (always local — no backend needed) ─────────────────────────────

export async function mockGetQuestions(): Promise<ApiResult<BackendDiagnosticQuestion[]>> {
  const { getFallbackQuestions } = await import('./diagnostic');
  const mapped = getFallbackQuestions();

  const raw: BackendDiagnosticQuestion[] = mapped.questions.map((q) => ({
    questionCode:  q.questionCode,
    questionText:  q.questionText,
    sequence:      q.sequence,
    sectionCode:   q.sectionCode,
    sectionLabel:  q.sectionLabel,
    options:       q.options.map((o, idx) => ({
      optionCode: o.code,
      label:      o.label,
      sequence:   idx + 1,
    })),
  }));

  return ok(raw);
}
