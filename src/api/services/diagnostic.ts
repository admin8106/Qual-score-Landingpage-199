/**
 * Diagnostic service — wraps /api/v1/diagnostic endpoints.
 *
 * Flow:
 *   1. getQuestions()     → fetch all questions to render the diagnostic form
 *   2. submitAnswers()    → submit all answers at once (backend derives scores)
 *   3. triggerAnalysis()  → kick off async AI analysis + report generation
 *
 * All question option scores are backend-managed.
 * The frontend renders questions and options without knowing their point values.
 */

import { httpClient } from '../httpClient';
import { ok } from '../types';
import type { ApiResult } from '../types';
import { opFlags } from '../../utils/opFlags';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

export interface BackendQuestionOption {
  optionCode: string;
  label: string;
  sequence: number;
}

export interface BackendDiagnosticQuestion {
  questionCode: string;
  questionText: string;
  sequence: number;
  sectionCode: string;
  sectionLabel: string;
  options: BackendQuestionOption[];
}

// ─── UI-facing shapes ─────────────────────────────────────────────────────────

export interface UiQuestionOption {
  code: string;
  label: string;
}

export interface UiQuestion {
  questionCode: string;
  questionText: string;
  sequence: number;
  sectionCode: string;
  sectionLabel: string;
  options: UiQuestionOption[];
}

export interface UiSection {
  sectionCode: string;
  sectionLabel: string;
  letter: string;
  questionCodes: string[];
}

export interface MappedQuestions {
  questions: UiQuestion[];
  sections: UiSection[];
  total: number;
}

// ─── Adapter: backend → UI ────────────────────────────────────────────────────

const SECTION_LETTER_MAP: Record<string, string> = {
  career_direction:        'A',
  job_search_behavior:     'B',
  opportunity_readiness:   'C',
  flexibility_constraints: 'D',
  improvement_intent:      'E',
};

function deriveLetterFromIndex(index: number): string {
  return String.fromCharCode(65 + index);
}

export function mapBackendQuestions(raw: BackendDiagnosticQuestion[]): MappedQuestions {
  const sorted = [...raw].sort((a, b) => a.sequence - b.sequence);

  const sectionMap = new Map<string, UiSection>();
  let sectionIndex = 0;

  for (const q of sorted) {
    if (!sectionMap.has(q.sectionCode)) {
      const letter = SECTION_LETTER_MAP[q.sectionCode] ?? deriveLetterFromIndex(sectionIndex);
      sectionMap.set(q.sectionCode, {
        sectionCode: q.sectionCode,
        sectionLabel: q.sectionLabel,
        letter,
        questionCodes: [],
      });
      sectionIndex++;
    }
    sectionMap.get(q.sectionCode)!.questionCodes.push(q.questionCode);
  }

  const questions: UiQuestion[] = sorted.map((q) => ({
    questionCode: q.questionCode,
    questionText: q.questionText,
    sequence: q.sequence,
    sectionCode: q.sectionCode,
    sectionLabel: q.sectionLabel,
    options: [...q.options]
      .sort((a, b) => a.sequence - b.sequence)
      .map((o) => ({ code: o.optionCode, label: o.label })),
  }));

  return {
    questions,
    sections: Array.from(sectionMap.values()),
    total: questions.length,
  };
}

// ─── FALLBACK questions (development only) ────────────────────────────────────
// Used when GET /api/v1/diagnostic/questions fails (e.g. backend not running locally).
// These mirror the backend master and are clearly marked as a dev fallback.
// DO NOT use in production — they will be overridden by the real backend response.

const FALLBACK_QUESTIONS: BackendDiagnosticQuestion[] = [
  {
    questionCode: 'CD_01', questionText: 'Which role are you actively targeting right now?',
    sequence: 1, sectionCode: 'career_direction', sectionLabel: 'Career Direction',
    options: [
      { optionCode: 'CD_01_A', label: 'Same as my current or most recent role', sequence: 1 },
      { optionCode: 'CD_01_B', label: 'A slightly advanced version of my current role', sequence: 2 },
      { optionCode: 'CD_01_C', label: 'A different role within the same domain', sequence: 3 },
      { optionCode: 'CD_01_D', label: 'I am still exploring multiple unrelated roles', sequence: 4 },
    ],
  },
  {
    questionCode: 'CD_02', questionText: 'Which best describes your current job search goal?',
    sequence: 2, sectionCode: 'career_direction', sectionLabel: 'Career Direction',
    options: [
      { optionCode: 'CD_02_A', label: 'I am urgently looking for a job', sequence: 1 },
      { optionCode: 'CD_02_B', label: 'I am looking for better growth opportunities', sequence: 2 },
      { optionCode: 'CD_02_C', label: 'I am exploring the market casually', sequence: 3 },
      { optionCode: 'CD_02_D', label: 'I am not actively searching, only checking my standing', sequence: 4 },
    ],
  },
  {
    questionCode: 'CD_03', questionText: 'What do you think is the biggest reason you are not getting enough interview calls?',
    sequence: 3, sectionCode: 'career_direction', sectionLabel: 'Career Direction',
    options: [
      { optionCode: 'CD_03_A', label: 'My profile is not positioned strongly enough', sequence: 1 },
      { optionCode: 'CD_03_B', label: 'My skills may not match market demand well enough', sequence: 2 },
      { optionCode: 'CD_03_C', label: 'My visibility and recruiter reach are low', sequence: 3 },
      { optionCode: 'CD_03_D', label: 'I am not sure what the exact issue is', sequence: 4 },
    ],
  },
  {
    questionCode: 'JS_01', questionText: 'On average, how many relevant jobs do you apply to in a week?',
    sequence: 4, sectionCode: 'job_search_behavior', sectionLabel: 'Job Search Behavior',
    options: [
      { optionCode: 'JS_01_A', label: '15 or more', sequence: 1 },
      { optionCode: 'JS_01_B', label: '8 to 14', sequence: 2 },
      { optionCode: 'JS_01_C', label: '3 to 7', sequence: 3 },
      { optionCode: 'JS_01_D', label: '0 to 2', sequence: 4 },
    ],
  },
  {
    questionCode: 'JS_02', questionText: 'How do you usually apply for opportunities?',
    sequence: 5, sectionCode: 'job_search_behavior', sectionLabel: 'Job Search Behavior',
    options: [
      { optionCode: 'JS_02_A', label: 'Through both job portals and networking/referrals', sequence: 1 },
      { optionCode: 'JS_02_B', label: 'Mostly through LinkedIn or job portals', sequence: 2 },
      { optionCode: 'JS_02_C', label: 'Mostly through referrals or personal contacts only', sequence: 3 },
      { optionCode: 'JS_02_D', label: 'I apply inconsistently without a fixed approach', sequence: 4 },
    ],
  },
  {
    questionCode: 'JS_03', questionText: 'After applying for a role, what do you usually do next?',
    sequence: 6, sectionCode: 'job_search_behavior', sectionLabel: 'Job Search Behavior',
    options: [
      { optionCode: 'JS_03_A', label: 'I follow up or try to connect with recruiters consistently', sequence: 1 },
      { optionCode: 'JS_03_B', label: 'I track applications and follow up selectively', sequence: 2 },
      { optionCode: 'JS_03_C', label: 'I usually wait for a response', sequence: 3 },
      { optionCode: 'JS_03_D', label: 'I usually do nothing further', sequence: 4 },
    ],
  },
  {
    questionCode: 'OR_01', questionText: 'If you get shortlisted tomorrow, how prepared are you for interviews?',
    sequence: 7, sectionCode: 'opportunity_readiness', sectionLabel: 'Opportunity Readiness',
    options: [
      { optionCode: 'OR_01_A', label: 'Fully ready', sequence: 1 },
      { optionCode: 'OR_01_B', label: 'Mostly ready, with slight preparation needed', sequence: 2 },
      { optionCode: 'OR_01_C', label: 'I need significant preparation', sequence: 3 },
      { optionCode: 'OR_01_D', label: 'I am not ready at all', sequence: 4 },
    ],
  },
  {
    questionCode: 'OR_02', questionText: 'Which best describes your proof of work beyond LinkedIn?',
    sequence: 8, sectionCode: 'opportunity_readiness', sectionLabel: 'Opportunity Readiness',
    options: [
      { optionCode: 'OR_02_A', label: 'Strong portfolio, projects, or measurable achievements', sequence: 1 },
      { optionCode: 'OR_02_B', label: 'Some visible proof exists, but it is not well organized', sequence: 2 },
      { optionCode: 'OR_02_C', label: 'I have limited proof of work', sequence: 3 },
      { optionCode: 'OR_02_D', label: 'I do not have strong proof available', sequence: 4 },
    ],
  },
  {
    questionCode: 'OR_03', questionText: 'How clearly can you explain your work impact in interviews?',
    sequence: 9, sectionCode: 'opportunity_readiness', sectionLabel: 'Opportunity Readiness',
    options: [
      { optionCode: 'OR_03_A', label: 'Very clearly, with examples and measurable impact', sequence: 1 },
      { optionCode: 'OR_03_B', label: 'Fairly clearly', sequence: 2 },
      { optionCode: 'OR_03_C', label: 'Only at a basic level', sequence: 3 },
      { optionCode: 'OR_03_D', label: 'I struggle to explain it confidently', sequence: 4 },
    ],
  },
  {
    questionCode: 'FC_01', questionText: 'Which work setup are you open to?',
    sequence: 10, sectionCode: 'flexibility_constraints', sectionLabel: 'Flexibility & Constraints',
    options: [
      { optionCode: 'FC_01_A', label: 'Open to on-site, hybrid, and remote', sequence: 1 },
      { optionCode: 'FC_01_B', label: 'Open to hybrid and remote only', sequence: 2 },
      { optionCode: 'FC_01_C', label: 'Open to on-site only', sequence: 3 },
      { optionCode: 'FC_01_D', label: 'I have very restricted preferences', sequence: 4 },
    ],
  },
  {
    questionCode: 'FC_02', questionText: 'Are you open to changing city or location for the right opportunity?',
    sequence: 11, sectionCode: 'flexibility_constraints', sectionLabel: 'Flexibility & Constraints',
    options: [
      { optionCode: 'FC_02_A', label: 'Yes', sequence: 1 },
      { optionCode: 'FC_02_B', label: 'Maybe, depending on the role', sequence: 2 },
      { optionCode: 'FC_02_C', label: 'Only within my current city or region', sequence: 3 },
      { optionCode: 'FC_02_D', label: 'No', sequence: 4 },
    ],
  },
  {
    questionCode: 'FC_03', questionText: 'Which best describes your salary expectation right now?',
    sequence: 12, sectionCode: 'flexibility_constraints', sectionLabel: 'Flexibility & Constraints',
    options: [
      { optionCode: 'FC_03_A', label: 'It is realistic for my profile and current market', sequence: 1 },
      { optionCode: 'FC_03_B', label: 'It is slightly ambitious but still reasonable', sequence: 2 },
      { optionCode: 'FC_03_C', label: 'I am not sure what is realistic', sequence: 3 },
      { optionCode: 'FC_03_D', label: 'It may be higher than what the market would currently support', sequence: 4 },
    ],
  },
  {
    questionCode: 'II_01', questionText: 'Which area do you believe needs the most improvement for better shortlisting?',
    sequence: 13, sectionCode: 'improvement_intent', sectionLabel: 'Improvement Intent',
    options: [
      { optionCode: 'II_01_A', label: 'Profile positioning and presentation', sequence: 1 },
      { optionCode: 'II_01_B', label: 'Skills and role alignment', sequence: 2 },
      { optionCode: 'II_01_C', label: 'Interview readiness and confidence', sequence: 3 },
      { optionCode: 'II_01_D', label: 'I am not sure what exactly needs improvement', sequence: 4 },
    ],
  },
  {
    questionCode: 'II_02', questionText: 'How actively are you working on improving your employability right now?',
    sequence: 14, sectionCode: 'improvement_intent', sectionLabel: 'Improvement Intent',
    options: [
      { optionCode: 'II_02_A', label: 'Very actively and consistently', sequence: 1 },
      { optionCode: 'II_02_B', label: 'Somewhat actively', sequence: 2 },
      { optionCode: 'II_02_C', label: 'Occasionally', sequence: 3 },
      { optionCode: 'II_02_D', label: 'Hardly at all', sequence: 4 },
    ],
  },
  {
    questionCode: 'II_03', questionText: 'If your diagnostic report shows clear gaps, what are you most likely to do next?',
    sequence: 15, sectionCode: 'improvement_intent', sectionLabel: 'Improvement Intent',
    options: [
      { optionCode: 'II_03_A', label: 'Book a detailed evaluation and work on improvement', sequence: 1 },
      { optionCode: 'II_03_B', label: 'Study the gaps first and then decide', sequence: 2 },
      { optionCode: 'II_03_C', label: 'Try to fix things on my own without further support', sequence: 3 },
      { optionCode: 'II_03_D', label: 'Probably do nothing immediately', sequence: 4 },
    ],
  },
];

export function getFallbackQuestions(): MappedQuestions {
  return mapBackendQuestions(FALLBACK_QUESTIONS);
}

// ─── Submit types ─────────────────────────────────────────────────────────────

export interface DiagnosticAnswerSubmit {
  questionCode: string;
  selectedOptionCode: string;
}

export interface SubmitDiagnosticRequest {
  candidateCode: string;
  answers: DiagnosticAnswerSubmit[];
}

export interface SubmitDiagnosticResponse {
  sessionId: string;
  answersReceived: number;
  status: string;
}

// ─── Analysis types ───────────────────────────────────────────────────────────

export type AnalysisStatus =
  | 'INITIATED'
  | 'ACCEPTED'
  | 'SCORING'
  | 'LINKEDIN_ANALYSIS'
  | 'REPORT_GENERATION'
  | 'COMPLETED'
  | 'FAILED';

export const ANALYSIS_TERMINAL_STATES: AnalysisStatus[] = ['COMPLETED', 'FAILED'];

export interface TriggerAnalysisRequest {
  candidateCode: string;
  linkedinUrl?: string;
}

export interface TriggerAnalysisResponse {
  candidateCode: string;
  status: AnalysisStatus;
  finalEmployabilityScore?: number;
  bandLabel?: string;
  linkedinScore?: number;
  reportStatus?: string;
  errorMessage?: string;
  errorCode?: string;
}

export type AnalysisStatusResponse = TriggerAnalysisResponse;

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/diagnostic';

export const diagnosticApi = {
  async getQuestions(): Promise<ApiResult<BackendDiagnosticQuestion[]>> {
    if (opFlags.mockPayment) {
      const { mockGetQuestions } = await import('./mockBackend');
      return mockGetQuestions();
    }
    const result = await httpClient.get<BackendDiagnosticQuestion[]>(`${BASE}/questions`);
    if (!result.ok) {
      return ok(mapBackendQuestions(FALLBACK_QUESTIONS).questions.map((q) => ({
        questionCode:  q.questionCode,
        questionText:  q.questionText,
        sequence:      q.sequence,
        sectionCode:   q.sectionCode,
        sectionLabel:  q.sectionLabel,
        options:       q.options.map((o, i) => ({ optionCode: o.code, label: o.label, sequence: i + 1 })),
      })));
    }
    return result;
  },

  async submitAnswers(request: SubmitDiagnosticRequest): Promise<ApiResult<SubmitDiagnosticResponse>> {
    if (opFlags.mockPayment) {
      const { mockSubmitAnswers } = await import('./mockBackend');
      return mockSubmitAnswers(request.candidateCode, request.answers);
    }
    return httpClient.post<SubmitDiagnosticResponse>(`${BASE}/submit`, request);
  },

  async triggerAnalysis(request: TriggerAnalysisRequest): Promise<ApiResult<TriggerAnalysisResponse>> {
    if (opFlags.mockPayment) {
      const { mockTriggerAnalysis } = await import('./mockBackend');
      return mockTriggerAnalysis(request.candidateCode, request.linkedinUrl);
    }
    return httpClient.post<TriggerAnalysisResponse>(
      `${BASE}/analyze/${encodeURIComponent(request.candidateCode)}`,
      { linkedinUrl: request.linkedinUrl ?? null },
      { timeoutMs: 90_000 },
    );
  },

  async getAnalysisStatus(candidateCode: string): Promise<ApiResult<AnalysisStatusResponse>> {
    if (opFlags.mockPayment) {
      return ok<AnalysisStatusResponse>({
        candidateCode,
        status:                  'COMPLETED',
        finalEmployabilityScore: 62,
        bandLabel:               'Needs Optimization',
        reportStatus:            'COMPLETED',
      });
    }
    return httpClient.get<AnalysisStatusResponse>(
      `${BASE}/analyze/${encodeURIComponent(candidateCode)}/status`,
    );
  },
};
