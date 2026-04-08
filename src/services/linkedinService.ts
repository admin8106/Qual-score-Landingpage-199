/**
 * LinkedIn Profile Analysis Service
 *
 * CURRENT STATE: Mock implementation producing deterministic, realistic placeholder
 * data for UI development and internal testing. All public method signatures are
 * production-ready and will remain unchanged when real integration is added.
 *
 * ─── FUTURE 2-STEP AI INTEGRATION PLAN ──────────────────────────────────────
 *
 * STEP 1 — Prompt A: LinkedIn Analyzer
 *   Input : LinkedIn URL (fetched via Proxycurl or equivalent scraping proxy)
 *   Model : GPT-4o / Claude 3.5 Sonnet (structured JSON mode)
 *   Output: LinkedInProfileAnalysis JSON — 13 numeric signals + narrative arrays
 *   Note  : This prompt runs inside a Supabase Edge Function so the API key
 *           never touches the client.  See: supabase/functions/analyze-linkedin/
 *
 * STEP 2 — Prompt B: Final Diagnostic Report Generator
 *   Input : CandidateDetails + LinkedInProfileAnalysis + SectionScores
 *           + FinalScore + CrmTag[]
 *   Model : Same LLM, separate prompt template (see aiPrompts.ts)
 *   Output: ReportData narrative fields — personalized findings, recommendations,
 *           written summary paragraph, WhatsApp-ready digest
 *   Note  : Runs inside a second Edge Function call after Prompt A completes.
 *
 * REPLACEMENT PATH:
 *   1. Implement supabase/functions/analyze-linkedin/ (calls Proxycurl → LLM)
 *   2. Replace `generateMockLinkedInAnalysis` body with an Edge Function fetch
 *   3. Everything downstream (normalizeLinkedInAnalysis, getLinkedInScoreFromAnalysis,
 *      fetchLinkedInProfileAnalysis) continues to work without changes.
 *
 * ENV SECRETS NEEDED (Supabase Edge Function secrets, NOT in .env):
 *   PROXYCURL_API_KEY  — LinkedIn profile scraping
 *   OPENAI_API_KEY     — or ANTHROPIC_API_KEY / GEMINI_API_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CandidateDetails, LinkedInAnalysis, LinkedInProfileAnalysis } from '../types';
import { isValidLinkedInProfileUrl } from '../utils/linkedinValidator';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deterministicHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function clamp(v: number, min = 1, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}

function scaleFrom(base: number, offset: number, spread: number): number {
  return clamp(base + ((offset % spread) - spread / 2) * 0.4);
}

// ─── Raw analysis generator ───────────────────────────────────────────────────
// Produces a `LinkedInProfileAnalysis` from deterministic seed values.
// Replace this function body with a real API call when ready.

export function generateMockLinkedInAnalysis(candidate: CandidateDetails): LinkedInProfileAnalysis {
  const seed = deterministicHash(`${candidate.email}::${candidate.linkedinUrl}`);
  const yoe = parseInt(candidate.yearsExperience, 10) || 0;
  const expBonus = Math.min(yoe * 0.25, 2);

  const base = {
    headline_clarity: scaleFrom(6, seed, 7),
    role_clarity: scaleFrom(5 + expBonus, seed >> 2, 6),
    profile_completeness: scaleFrom(5, seed >> 4, 9),
    about_quality: scaleFrom(5, seed >> 6, 8),
    experience_presentation: scaleFrom(5 + expBonus, seed >> 8, 7),
    proof_of_work_visibility: scaleFrom(4, seed >> 10, 8),
    certifications_signal: scaleFrom(4, seed >> 12, 7),
    recommendation_signal: scaleFrom(4, seed >> 14, 7),
    activity_visibility: scaleFrom(4, seed >> 16, 8),
    career_consistency: scaleFrom(6 + expBonus, seed >> 18, 6),
    growth_progression: scaleFrom(5 + expBonus, seed >> 20, 7),
    differentiation_strength: scaleFrom(4, seed >> 22, 8),
    recruiter_attractiveness: scaleFrom(5, seed >> 24, 7),
  };

  const summary_notes = buildSummaryNotes(base, candidate);
  const top_strengths = buildStrengths(base);
  const top_concerns = buildConcerns(base);

  return { ...base, summary_notes, top_strengths, top_concerns };
}

// ─── Narrative builders ───────────────────────────────────────────────────────

function buildSummaryNotes(
  scores: Omit<LinkedInProfileAnalysis, 'summary_notes' | 'top_strengths' | 'top_concerns'>,
  candidate: CandidateDetails
): string[] {
  const notes: string[] = [];

  if (scores.profile_completeness < 5) {
    notes.push(
      `${candidate.name}'s profile is missing critical sections that reduce recruiter confidence.`
    );
  } else if (scores.profile_completeness >= 8) {
    notes.push(`Profile completeness is strong — most recruiter-visible fields are populated.`);
  }

  if (scores.activity_visibility < 5) {
    notes.push(
      'Low activity on LinkedIn means this profile rarely appears in recruiter feeds or discovery algorithms.'
    );
  }

  if (scores.proof_of_work_visibility < 5) {
    notes.push(
      'No visible proof of work (portfolio, case studies, featured posts) detected in profile analysis.'
    );
  }

  if (scores.headline_clarity >= 7) {
    notes.push(
      'Headline appears clear and role-specific, which improves keyword match in recruiter searches.'
    );
  } else {
    notes.push(
      'Headline may be too generic or vague, reducing search discoverability for target roles.'
    );
  }

  if (scores.recommendation_signal < 5) {
    notes.push(
      'Absence of LinkedIn recommendations weakens third-party credibility signals for hiring managers.'
    );
  }

  return notes.slice(0, 4);
}

function buildStrengths(
  scores: Omit<LinkedInProfileAnalysis, 'summary_notes' | 'top_strengths' | 'top_concerns'>
): string[] {
  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  return entries
    .filter(([, v]) => v >= 7)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => DIMENSION_LABELS[k]);
}

function buildConcerns(
  scores: Omit<LinkedInProfileAnalysis, 'summary_notes' | 'top_strengths' | 'top_concerns'>
): string[] {
  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  return entries
    .filter(([, v]) => v < 5)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([k]) => DIMENSION_LABELS[k]);
}

const DIMENSION_LABELS: Record<
  keyof Omit<LinkedInProfileAnalysis, 'summary_notes' | 'top_strengths' | 'top_concerns'>,
  string
> = {
  headline_clarity: 'Headline Clarity',
  role_clarity: 'Role Clarity',
  profile_completeness: 'Profile Completeness',
  about_quality: 'About Section Quality',
  experience_presentation: 'Experience Presentation',
  proof_of_work_visibility: 'Proof of Work Visibility',
  certifications_signal: 'Certifications Signal',
  recommendation_signal: 'Recommendation Signal',
  activity_visibility: 'Activity Visibility',
  career_consistency: 'Career Consistency',
  growth_progression: 'Growth Progression',
  differentiation_strength: 'Differentiation Strength',
  recruiter_attractiveness: 'Recruiter Attractiveness',
};

// ─── normalizeLinkedInAnalysis ────────────────────────────────────────────────
// Converts a raw LinkedInProfileAnalysis into the enriched LinkedInAnalysis
// shape used by the scoring engine.  Remains stable across mock and real data.

export function normalizeLinkedInAnalysis(
  raw: LinkedInProfileAnalysis,
  candidate: CandidateDetails
): LinkedInAnalysis {
  const score = getLinkedInScoreFromAnalysis(raw);

  const completeness = raw.profile_completeness * 10;
  const keywordOptimization = Math.round(
    ((raw.headline_clarity + raw.role_clarity + raw.differentiation_strength) / 3) * 10
  );

  const activityRaw = raw.activity_visibility;
  const activityLevel: LinkedInAnalysis['activityLevel'] =
    activityRaw >= 7 ? 'high' : activityRaw >= 5 ? 'moderate' : 'low';

  const connectionRaw = (raw.recommendation_signal + raw.recruiter_attractiveness) / 2;
  const connectionStrength: LinkedInAnalysis['connectionStrength'] =
    connectionRaw >= 7 ? 'strong' : connectionRaw >= 5 ? 'moderate' : 'weak';

  const headlinePhrases: Record<LinkedInAnalysis['activityLevel'], string> = {
    low: 'Profile exists but shows limited activity or optimization',
    moderate: `${candidate.name}'s profile is partially optimised with moderate engagement`,
    high: 'Profile appears active with strong keyword coverage and recruiter attractiveness',
  };

  return {
    score,
    headline: headlinePhrases[activityLevel],
    completeness,
    activityLevel,
    connectionStrength,
    keywordOptimization,
    profileAnalysis: raw,
    isMock: true,
  };
}

// ─── getLinkedInScoreFromAnalysis ─────────────────────────────────────────────
// Converts a LinkedInProfileAnalysis into a weighted 0–10 employability signal.
// Weights reflect relative importance to recruiter decision-making.

export function getLinkedInScoreFromAnalysis(analysis: LinkedInProfileAnalysis): number {
  const weighted =
    analysis.headline_clarity * 0.10 +
    analysis.role_clarity * 0.08 +
    analysis.profile_completeness * 0.12 +
    analysis.about_quality * 0.07 +
    analysis.experience_presentation * 0.12 +
    analysis.proof_of_work_visibility * 0.10 +
    analysis.certifications_signal * 0.05 +
    analysis.recommendation_signal * 0.06 +
    analysis.activity_visibility * 0.10 +
    analysis.career_consistency * 0.08 +
    analysis.growth_progression * 0.06 +
    analysis.differentiation_strength * 0.04 +
    analysis.recruiter_attractiveness * 0.02;

  return parseFloat(Math.min(10, Math.max(1, weighted)).toFixed(1));
}

// ─── fetchLinkedInProfileAnalysis ────────────────────────────────────────────
// Public entry point.  Returns a normalized LinkedInAnalysis.
//
// FUTURE REPLACEMENT:
//   Replace the body of this function with:
//     const raw = await callEdgeFunction('analyze-linkedin', { linkedinUrl, candidate });
//     return normalizeLinkedInAnalysis(raw, candidate);
//
// The caller (scoringEngine.ts) will not need to change.

export async function fetchLinkedInProfileAnalysis(
  linkedinUrl: string,
  candidate: CandidateDetails
): Promise<LinkedInAnalysis> {
  if (!linkedinUrl || !isValidLinkedInProfileUrl(linkedinUrl)) {
    throw new Error('Invalid LinkedIn profile URL — cannot generate analysis');
  }
  const raw = generateMockLinkedInAnalysis(candidate);
  return normalizeLinkedInAnalysis(raw, candidate);
}
