import {
  DiagnosticAnswer,
  CandidateDetails,
  SectionScores,
  LinkedInAnalysis,
  FinalScore,
  ScoreBand,
  CrmTag,
} from '../types';
import {
  fetchLinkedInProfileAnalysis,
  getLinkedInScoreFromAnalysis,
} from '../services/linkedinService';

// ─── Section question mapping ────────────────────────────────────────────────

const SECTION_QUESTION_IDS = {
  careerDirection: [1, 2, 3],
  jobSearchBehavior: [4, 5, 6],
  opportunityReadiness: [7, 8, 9],
  flexibilityConstraints: [10, 11, 12],
  improvementIntent: [13, 14, 15],
} as const;

// ─── Section score calculation ────────────────────────────────────────────────
// Each question is scored 1–10. Section score = simple average of its 3 questions.

function sectionAverage(questionIds: readonly number[], answers: DiagnosticAnswer[]): number {
  const scores = questionIds.map((id) => {
    const a = answers.find((ans) => ans.questionId === id);
    return a ? a.score : 0;
  });
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return parseFloat((sum / scores.length).toFixed(1));
}

export function computeSectionScores(answers: DiagnosticAnswer[]): SectionScores {
  return {
    careerDirection: sectionAverage(SECTION_QUESTION_IDS.careerDirection, answers),
    jobSearchBehavior: sectionAverage(SECTION_QUESTION_IDS.jobSearchBehavior, answers),
    opportunityReadiness: sectionAverage(SECTION_QUESTION_IDS.opportunityReadiness, answers),
    flexibilityConstraints: sectionAverage(SECTION_QUESTION_IDS.flexibilityConstraints, answers),
    improvementIntent: sectionAverage(SECTION_QUESTION_IDS.improvementIntent, answers),
  };
}

// ─── Final employability score ────────────────────────────────────────────────
// Formula:
//   (LinkedIn × 0.40) + (CareerDir × 0.12) + (JobSearch × 0.12)
//   + (Readiness × 0.16) + (Flexibility × 0.10) + (Intent × 0.10)

export function computeFinalEmployabilityScore(
  linkedInScore: number,
  sections: SectionScores
): number {
  const raw =
    linkedInScore * 0.4 +
    sections.careerDirection * 0.12 +
    sections.jobSearchBehavior * 0.12 +
    sections.opportunityReadiness * 0.16 +
    sections.flexibilityConstraints * 0.1 +
    sections.improvementIntent * 0.1;

  return parseFloat(raw.toFixed(1));
}

// ─── Score band ───────────────────────────────────────────────────────────────

export function getScoreBand(finalScore: number): ScoreBand {
  if (finalScore <= 4.9) return 'critical';
  if (finalScore <= 7.4) return 'needs_optimization';
  return 'strong';
}

export function getScoreBandLabel(band: ScoreBand): string {
  switch (band) {
    case 'critical':
      return 'Critical';
    case 'needs_optimization':
      return 'Needs Optimization';
    case 'strong':
      return 'Strong with Improvement Opportunities';
  }
}

// ─── CRM tag generation ───────────────────────────────────────────────────────

export function computeCrmTags(
  sections: SectionScores,
  answers: DiagnosticAnswer[],
  finalScore: number
): CrmTag[] {
  const tags = new Set<CrmTag>();

  if (sections.careerDirection < 5.0) tags.add('career_clarity_low');
  if (sections.jobSearchBehavior < 5.0) tags.add('job_search_inconsistent');
  if (sections.opportunityReadiness < 5.0) tags.add('interview_readiness_low');
  if (sections.flexibilityConstraints < 5.0) tags.add('flexibility_low');

  if (sections.improvementIntent > 7.0) {
    tags.add('high_intent');
  } else if (sections.improvementIntent >= 5.0) {
    tags.add('warm_lead');
  } else {
    tags.add('low_action_intent');
  }

  const q8 = answers.find((a) => a.questionId === 8);
  if (q8 && (q8.score === 1 || q8.score === 4)) tags.add('proof_of_work_low');

  const q12 = answers.find((a) => a.questionId === 12);
  if (q12 && q12.score === 1) tags.add('salary_expectation_risk');

  const q15 = answers.find((a) => a.questionId === 15);
  if (q15) {
    if (q15.score === 10) tags.add('consultation_priority');
    if (q15.score === 7) tags.add('nurture_after_report');
    if (q15.score === 1 || q15.score === 4) tags.add('low_immediate_conversion');
  }

  if (finalScore < 5) {
    tags.add('high_pain_lead');
  } else if (finalScore < 7.5) {
    tags.add('warm_diagnostic_lead');
  } else {
    tags.add('premium_lead');
  }

  return Array.from(tags);
}

// ─── Async master evaluation runner ──────────────────────────────────────────
// Delegates LinkedIn analysis to linkedinService so the replacement path
// is entirely contained in that one service file.

export async function runScoringEngine(
  answers: DiagnosticAnswer[],
  candidate: CandidateDetails
): Promise<FinalScore> {
  const linkedInAnalysis: LinkedInAnalysis = await fetchLinkedInProfileAnalysis(
    candidate.linkedinUrl,
    candidate
  );

  const linkedInScore = getLinkedInScoreFromAnalysis(linkedInAnalysis.profileAnalysis);

  const sectionScores = computeSectionScores(answers);
  const finalEmployabilityScore = computeFinalEmployabilityScore(linkedInScore, sectionScores);
  const band = getScoreBand(finalEmployabilityScore);
  const tags = computeCrmTags(sectionScores, answers, finalEmployabilityScore);

  return {
    linkedInScore,
    sectionScores,
    finalEmployabilityScore,
    band,
    bandLabel: getScoreBandLabel(band),
    tags,
    linkedInAnalysis,
    computedAt: new Date().toISOString(),
  };
}
