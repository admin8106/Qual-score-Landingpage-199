/**
 * AI Prompt Templates
 *
 * These are placeholder prompt skeletons for the two-step LLM pipeline.
 * They are NOT executed at runtime — they serve as developer documentation
 * and will be copy-pasted into Supabase Edge Functions when real AI
 * integration is implemented.
 *
 * ─── HOW THESE ARE USED ──────────────────────────────────────────────────────
 *
 * STEP 1: PROMPT_A_LINKEDIN_ANALYZER
 *   Edge Function : supabase/functions/analyze-linkedin/index.ts
 *   Trigger       : Called by fetchLinkedInProfileAnalysis() in linkedinService.ts
 *   Model         : GPT-4o / Claude 3.5 Sonnet with JSON mode enforced
 *   Returns       : LinkedInProfileAnalysis (13 numeric signals + narrative arrays)
 *
 * STEP 2: PROMPT_B_REPORT_GENERATOR
 *   Edge Function : supabase/functions/generate-report/index.ts
 *   Trigger       : Called after scoring engine completes in AnalysisPage.tsx
 *   Model         : Same model, separate invocation
 *   Returns       : ReportNarrative (personalized findings, recommendations, digest)
 *
 * VARIABLE SUBSTITUTION:
 *   All {{VARIABLE}} tokens are replaced server-side before sending to the LLM.
 *   Template literals are intentionally avoided here to preserve the raw template
 *   for copy-paste into Edge Function code.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Prompt A: LinkedIn Profile Analyzer ─────────────────────────────────────

export const PROMPT_A_LINKEDIN_ANALYZER = {
  system: `You are a senior talent acquisition expert and LinkedIn optimization specialist with 15+ years of experience evaluating candidate profiles for recruitment across industries.

Your task is to analyze a LinkedIn profile and return a structured JSON evaluation. Be objective, evidence-based, and harsh where necessary. Do not pad scores — a mediocre profile should score mediocre.

IMPORTANT: Respond ONLY with valid JSON matching the exact schema provided. No markdown, no commentary outside the JSON.`,

  user: `Analyze the following LinkedIn profile and return a JSON object with EXACTLY these fields:

LinkedIn URL: {{LINKEDIN_URL}}

Profile Data:
{{PROFILE_RAW_TEXT}}

Candidate Context:
- Name: {{CANDIDATE_NAME}}
- Target Role: {{JOB_ROLE}}
- Industry: {{INDUSTRY}}
- Years of Experience: {{YEARS_EXPERIENCE}}
- Location: {{LOCATION}}

Return this exact JSON structure (all numeric scores are integers from 1 to 10):

{
  "headline_clarity": <1-10>,
  "role_clarity": <1-10>,
  "profile_completeness": <1-10>,
  "about_quality": <1-10>,
  "experience_presentation": <1-10>,
  "proof_of_work_visibility": <1-10>,
  "certifications_signal": <1-10>,
  "recommendation_signal": <1-10>,
  "activity_visibility": <1-10>,
  "career_consistency": <1-10>,
  "growth_progression": <1-10>,
  "differentiation_strength": <1-10>,
  "recruiter_attractiveness": <1-10>,
  "summary_notes": ["<observation 1>", "<observation 2>", "<observation 3>"],
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "top_concerns": ["<concern 1>", "<concern 2>", "<concern 3>"]
}

Scoring rubric:
- 1–3: Poor / Missing entirely
- 4–5: Below average / Generic
- 6–7: Adequate / Present but unoptimized
- 8–9: Strong / Well-executed
- 10: Exceptional / Industry-leading example`,

  outputSchema: `LinkedInProfileAnalysis`,
} as const;

// ─── Prompt B: Final Diagnostic Report Generator ──────────────────────────────

export const PROMPT_B_REPORT_GENERATOR = {
  system: `You are a career diagnostics analyst and senior employability consultant. You have access to a candidate's self-reported diagnostic assessment, their LinkedIn profile analysis, computed section scores, a final employability score, and internal CRM classification tags.

Your task is to generate a personalized, professional diagnostic report narrative. Be specific, direct, and actionable. Avoid generic advice. Tailor everything to the candidate's profile.

IMPORTANT: Respond ONLY with valid JSON matching the exact schema provided.`,

  user: `Generate a personalized diagnostic report narrative for the following candidate.

CANDIDATE PROFILE:
- Name: {{CANDIDATE_NAME}}
- Role: {{JOB_ROLE}}
- Industry: {{INDUSTRY}}
- Years of Experience: {{YEARS_EXPERIENCE}}
- Location: {{LOCATION}}
- Career Stage: {{CAREER_STAGE}}

SECTION SCORES (each out of 10):
- Career Direction: {{SCORE_CAREER_DIRECTION}}
- Job Search Behavior: {{SCORE_JOB_SEARCH}}
- Opportunity Readiness: {{SCORE_OPPORTUNITY_READINESS}}
- Flexibility & Constraints: {{SCORE_FLEXIBILITY}}
- Improvement Intent: {{SCORE_IMPROVEMENT_INTENT}}

LINKEDIN ANALYSIS (scores out of 10):
{{LINKEDIN_ANALYSIS_JSON}}

FINAL EMPLOYABILITY SCORE: {{FINAL_SCORE}} / 10
SCORE BAND: {{SCORE_BAND}}

INTERNAL CRM TAGS: {{CRM_TAGS_JSON}}

Return this exact JSON structure:

{
  "executive_summary": "<2-3 sentence personalized overview of the candidate's employability situation>",
  "linkedin_narrative": "<1-2 sentences specifically about their LinkedIn profile quality>",
  "key_findings": [
    { "type": "critical|warning|positive", "title": "<short title>", "description": "<specific, personalized description>" }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "title": "<action title>", "description": "<personalized rationale>", "action": "<specific next step>" }
  ],
  "whatsapp_digest": "<A 3-4 sentence WhatsApp-ready summary a consultant could send to the candidate after the report>"
}

Constraints:
- key_findings: minimum 3, maximum 6 items
- recommendations: minimum 3, maximum 5 items
- All findings and recommendations must be personalized to the candidate — no generic advice
- executive_summary must mention the candidate's name and score band
- whatsapp_digest must be conversational, warm but direct`,

  outputSchema: `ReportNarrative`,
} as const;

// ─── Prompt variable token map ────────────────────────────────────────────────
// Documents every {{TOKEN}} used across both prompts for the Edge Function
// builder to reference during substitution logic.

export const PROMPT_VARIABLE_TOKENS = {
  LINKEDIN_URL: 'candidateDetails.linkedinUrl',
  PROFILE_RAW_TEXT: 'fetched via Proxycurl API — raw text content of the profile page',
  CANDIDATE_NAME: 'candidateDetails.name',
  JOB_ROLE: 'candidateDetails.jobRole',
  INDUSTRY: 'candidateDetails.industry',
  YEARS_EXPERIENCE: 'candidateDetails.yearsExperience',
  LOCATION: 'candidateDetails.location',
  CAREER_STAGE: 'candidateDetails.careerStage',
  SCORE_CAREER_DIRECTION: 'evaluation.sectionScores.careerDirection',
  SCORE_JOB_SEARCH: 'evaluation.sectionScores.jobSearchBehavior',
  SCORE_OPPORTUNITY_READINESS: 'evaluation.sectionScores.opportunityReadiness',
  SCORE_FLEXIBILITY: 'evaluation.sectionScores.flexibilityConstraints',
  SCORE_IMPROVEMENT_INTENT: 'evaluation.sectionScores.improvementIntent',
  LINKEDIN_ANALYSIS_JSON: 'JSON.stringify(evaluation.linkedInAnalysis.profileAnalysis)',
  FINAL_SCORE: 'evaluation.finalEmployabilityScore',
  SCORE_BAND: 'evaluation.bandLabel',
  CRM_TAGS_JSON: 'JSON.stringify(evaluation.tags)',
} as const;

// ─── Edge Function call shapes ────────────────────────────────────────────────
// Typed request/response shapes for future Edge Function consumers.

export interface PromptARequest {
  linkedinUrl: string;
  profileRawText: string;
  candidateName: string;
  jobRole: string;
  industry: string;
  yearsExperience: string;
  location: string;
}

export interface PromptBRequest {
  candidateName: string;
  jobRole: string;
  industry: string;
  yearsExperience: string;
  location: string;
  careerStage: string;
  sectionScores: Record<string, number>;
  linkedInAnalysis: Record<string, unknown>;
  finalScore: number;
  scoreBand: string;
  crmTags: string[];
}

export interface ReportNarrative {
  executive_summary: string;
  linkedin_narrative: string;
  key_findings: Array<{
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
  whatsapp_digest: string;
}
