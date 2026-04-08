/**
 * Report service — wraps /api/v1/reports endpoints.
 *
 * Reports are generated asynchronously after triggerAnalysis() is called.
 * Poll getReport() until reportStatus === "COMPLETED" or "FAILED".
 * The report includes all data needed to render the full diagnostic result page.
 *
 * Typical polling interval: 2–3 seconds with a maximum of 30 attempts.
 * See useAsync hook for polling utilities.
 */

import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';
import { opFlags } from '../../utils/opFlags';

export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'GENERATED' | 'GENERATED_AI' | 'GENERATED_FALLBACK' | 'RULE_BASED' | 'FAILED';

export interface ScoreSummary {
  employabilityScore: number;
  bandLabel: string;
  tagline: string;
}

export interface DimensionScore {
  area: string;
  score: number;
  status: string;
  remark: string;
}

export interface CtaBlock {
  headline: string;
  body: string;
  buttonText: string;
}

export interface DiagnosticReport {
  candidateCode: string;
  reportStatus: ReportStatus;
  reportTitle?: string;
  scoreSummary?: ScoreSummary;
  linkedinInsight?: string;
  behavioralInsight?: string;
  dimensionBreakdown?: DimensionScore[];
  topGaps?: string[];
  riskProjection?: string;
  recommendation?: string;
  recruiterViewInsight?: string;
  ctaBlock?: CtaBlock;
  generatedAt?: string;
}

const BASE = '/api/v1/reports';

export const reportsApi = {
  async getReport(candidateCode: string): Promise<ApiResult<DiagnosticReport>> {
    if (opFlags.mockPayment) {
      const { mockGetReport } = await import('./mockBackend');
      return mockGetReport(candidateCode);
    }
    return httpClient.get<DiagnosticReport>(`${BASE}/${encodeURIComponent(candidateCode)}`);
  },
};
