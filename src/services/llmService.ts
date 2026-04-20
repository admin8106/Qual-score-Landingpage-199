/**
 * LLM Orchestration Service
 *
 * Coordinates the two-step AI pipeline described in aiPrompts.ts.
 * Currently returns mock/null responses so the full flow can be tested
 * without live API keys.
 *
 * ─── TWO-STEP PIPELINE OVERVIEW ──────────────────────────────────────────────
 *
 * STEP 1 — runLinkedInAnalysisPrompt  (Prompt A)
 *   - Sends LinkedIn URL + profile text to the LLM
 *   - Returns: LinkedInProfileAnalysis (13 signals + narratives)
 *   - Edge Function: supabase/functions/analyze-linkedin/
 *   - Status: MOCK — returns null; linkedinService generates deterministic mock
 *
 * STEP 2 — runReportGeneratorPrompt  (Prompt B)
 *   - Sends full candidate context, section scores, LinkedIn analysis, tags
 *   - Returns: ReportNarrative (executive summary, findings, recommendations,
 *              LinkedIn narrative, WhatsApp digest)
 *   - Edge Function: supabase/functions/generate-report/
 *   - Status: MOCK — returns null; report is rule-based via reportGenerator.ts
 *
 * ORCHESTRATOR — runDiagnosticAIPipeline
 *   - Single async function that calls both steps in sequence
 *   - Returns a merged AIPipelineResult
 *   - Callers only need to invoke this one function
 *
 * ─── FUTURE REPLACEMENT PATH ─────────────────────────────────────────────────
 *
 *   1. Implement Supabase Edge Functions for each step (see aiPrompts.ts)
 *   2. Replace the MOCK sections below with real Edge Function fetches:
 *        const res = await callEdgeFunction('analyze-linkedin', payload);
 *   3. The orchestrator, types, and callers remain unchanged.
 *
 * ENV SECRETS NEEDED (Supabase Edge Function secrets):
 *   OPENAI_API_KEY     — or ANTHROPIC_API_KEY / GEMINI_API_KEY
 *   PROXYCURL_API_KEY  — for live LinkedIn profile fetching (Step 1 only)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CandidateDetails, LinkedInProfileAnalysis, FinalScore } from '../types';
import { ReportNarrative } from '../constants/aiPrompts';
import { env } from '../config/env';

// ─── Internal Edge Function caller ───────────────────────────────────────────
// Thin wrapper around fetch so all Edge Function calls go through one place.
// Swap out this implementation if the base URL or auth header changes.

export async function callEdgeFunction<T>(
  functionSlug: string,
  payload: Record<string, unknown>
): Promise<T> {
  const url = `${env.supabaseUrl}/functions/v1/${functionSlug}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge Function "${functionSlug}" failed: ${res.status} — ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Step 1: LinkedIn Analyzer Prompt ────────────────────────────────────────

export interface LinkedInAnalysisPromptPayload {
  linkedinUrl: string;
  profileRawText: string;
  candidateName: string;
  jobRole: string;
  industry: string;
  yearsExperience: string;
  location: string;
}

/**
 * Calls the "analyze-linkedin" Edge Function which runs Prompt A.
 *
 * CURRENT STATE: Returns null — linkedinService.ts handles mock generation.
 *
 * FUTURE: Uncomment the real call and delete the mock return.
 */
export async function runLinkedInAnalysisPrompt(
  payload: LinkedInAnalysisPromptPayload
): Promise<LinkedInProfileAnalysis | null> {
  // ── MOCK: remove this block when Edge Function is ready ──
  console.debug('[llmService] runLinkedInAnalysisPrompt — MOCK (returning null)', payload);
  return null;

  // ── REAL implementation (uncomment when ready): ──
  // try {
  //   return await callEdgeFunction<LinkedInProfileAnalysis>('analyze-linkedin', payload);
  // } catch (err) {
  //   console.error('[llmService] runLinkedInAnalysisPrompt failed:', err);
  //   return null;
  // }
}

// ─── Step 2: Report Generator Prompt ─────────────────────────────────────────

export interface ReportGeneratorPromptPayload {
  candidateDetails: CandidateDetails;
  evaluation: FinalScore;
}

/**
 * Calls the "generate-report" Edge Function which runs Prompt B.
 *
 * CURRENT STATE: Returns null — reportGenerator.ts handles rule-based output.
 *
 * FUTURE: Uncomment the real call and delete the mock return.
 * The returned ReportNarrative should be merged into ReportData before
 * persisting, replacing or enriching the rule-based findings and recommendations.
 */
export async function runReportGeneratorPrompt(
  payload: ReportGeneratorPromptPayload
): Promise<ReportNarrative | null> {
  // ── MOCK: remove this block when Edge Function is ready ──
  console.debug('[llmService] runReportGeneratorPrompt — MOCK (returning null)', payload);
  return null;

  // ── REAL implementation (uncomment when ready): ──
  // try {
  //   return await callEdgeFunction<ReportNarrative>('generate-report', {
  //     candidateName: payload.candidateDetails.name,
  //     jobRole: payload.candidateDetails.jobRole,
  //     industry: payload.candidateDetails.industry,
  //     yearsExperience: payload.candidateDetails.yearsExperience,
  //     location: payload.candidateDetails.location,
  //     careerStage: payload.candidateDetails.careerStage,
  //     sectionScores: payload.evaluation.sectionScores,
  //     linkedInAnalysis: payload.evaluation.linkedInAnalysis.profileAnalysis,
  //     finalScore: payload.evaluation.finalEmployabilityScore,
  //     scoreBand: payload.evaluation.bandLabel,
  //     crmTags: payload.evaluation.tags,
  //   });
  // } catch (err) {
  //   console.error('[llmService] runReportGeneratorPrompt failed:', err);
  //   return null;
  // }
}

// ─── Pipeline result type ─────────────────────────────────────────────────────

export interface AIPipelineResult {
  linkedInAnalysis: LinkedInProfileAnalysis | null;
  reportNarrative: ReportNarrative | null;
  completedSteps: ('linkedin_analysis' | 'report_narrative')[];
  ranAt: string;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Single entry point for callers.  Runs both steps and collects results.
// Designed to be fault-tolerant — a failed step returns null, not a thrown error.

export async function runDiagnosticAIPipeline(
  candidate: CandidateDetails,
  evaluation: FinalScore
): Promise<AIPipelineResult> {
  const completedSteps: AIPipelineResult['completedSteps'] = [];

  const linkedInAnalysis = await runLinkedInAnalysisPrompt({
    linkedinUrl: candidate.linkedinUrl,
    profileRawText: '',
    candidateName: candidate.name,
    jobRole: candidate.jobRole,
    industry: candidate.industry,
    yearsExperience: candidate.yearsExperience,
    location: candidate.location,
  });

  if (linkedInAnalysis) completedSteps.push('linkedin_analysis');

  const reportNarrative = await runReportGeneratorPrompt({ candidateDetails: candidate, evaluation });

  if (reportNarrative) completedSteps.push('report_narrative');

  return {
    linkedInAnalysis,
    reportNarrative,
    completedSteps,
    ranAt: new Date().toISOString(),
  };
}
