import { FinalScore, CandidateDetails, ScoreBand, SectionScores } from '../types';

// ─── Band config ──────────────────────────────────────────────────────────────

export interface BandConfig {
  color: string;
  bgGradient: string;
  border: string;
  ringColor: string;
  badgeBg: string;
  badgeText: string;
  scoreSummary: string;
  ctaHeadline: string;
  ctaBody: string;
}

export function bandFromLabel(label: string): ScoreBand {
  const l = (label ?? '').toLowerCase();
  if (l.includes('critical') || l.includes('not competitive')) return 'critical';
  if (l.includes('needs') || l.includes('optimization')) return 'needs_optimization';
  return 'strong';
}

export function getBandConfig(band: ScoreBand | string, score: number): BandConfig {
  const resolved: ScoreBand =
    band === 'critical' || band === 'needs_optimization' || band === 'strong'
      ? (band as ScoreBand)
      : bandFromLabel(band as string);
  if (resolved === 'critical') {
    return {
      color: '#EF4444',
      bgGradient: 'from-red-950/60 to-slate-950',
      border: 'border-red-500/30',
      ringColor: '#EF4444',
      badgeBg: 'bg-red-500/15',
      badgeText: 'text-red-400',
      scoreSummary: `Your profile is currently not competitive enough. A score of ${score.toFixed(1)}/10 indicates significant structural gaps that are actively preventing you from being shortlisted.`,
      ctaHeadline: 'Upgrade to Full QualScore Evaluation',
      ctaBody: 'Get a verified report and fix your employability gaps faster.',
    };
  }
  if (resolved === 'needs_optimization') {
    return {
      color: '#F59E0B',
      bgGradient: 'from-amber-950/50 to-slate-950',
      border: 'border-amber-500/30',
      ringColor: '#F59E0B',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      scoreSummary: `You have potential, but key gaps are limiting your opportunities. A score of ${score.toFixed(1)}/10 means recruiters may overlook your profile for roles you are genuinely qualified for.`,
      ctaHeadline: 'Move to the Next Level with QualScore',
      ctaBody: 'Get a detailed breakdown and improve your profile for better shortlisting.',
    };
  }
  return {
    color: '#10B981',
    bgGradient: 'from-emerald-950/50 to-slate-950',
    border: 'border-emerald-500/30',
    ringColor: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    scoreSummary: `Your profile is strong, with a few areas to optimize. A score of ${score.toFixed(1)}/10 positions you ahead of most candidates — the right refinements can move you into the top shortlist tier.`,
    ctaHeadline: 'Strengthen Your Profile with QualScore',
    ctaBody: 'Turn your strong profile into a recruiter-preferred profile.',
  };
}

// ─── Dimension rows ───────────────────────────────────────────────────────────

export interface DimensionRow {
  label: string;
  score: number;
  status: 'Strong' | 'Fair' | 'Weak';
  statusColor: string;
  remark: string;
}

export function buildDimensionRows(evaluation: FinalScore): DimensionRow[] {
  const s = evaluation.sectionScores;
  const li = evaluation.linkedInScore;

  function statusFor(score: number): DimensionRow['status'] {
    if (score >= 7) return 'Strong';
    if (score >= 5) return 'Fair';
    return 'Weak';
  }

  function colorFor(status: DimensionRow['status']): string {
    if (status === 'Strong') return 'text-emerald-400';
    if (status === 'Fair') return 'text-amber-400';
    return 'text-red-400';
  }

  function remarkFor(key: keyof SectionScores | 'linkedin', score: number): string {
    if (key === 'linkedin') {
      if (score >= 7) return 'Profile is well-structured and recruiter-discoverable.';
      if (score >= 5) return 'Moderate visibility — headline and proof signals need work.';
      return 'Low recruiter attractiveness; profile structure needs a rebuild.';
    }
    if (key === 'careerDirection') {
      if (score >= 7) return 'Clear target role and trajectory — reduces recruiter ambiguity.';
      if (score >= 5) return 'Partial clarity; role intent is present but not precise.';
      return 'Unclear career direction signals indecision to hiring managers.';
    }
    if (key === 'jobSearchBehavior') {
      if (score >= 7) return 'Consistent, strategic application behavior detected.';
      if (score >= 5) return 'Inconsistent effort — likely applying broadly without targeting.';
      return 'Low job search activity or ineffective outreach patterns.';
    }
    if (key === 'opportunityReadiness') {
      if (score >= 7) return 'Interview-ready with portfolio, referrals, or proof of work.';
      if (score >= 5) return 'Partially prepared — interview readiness can be improved.';
      return 'Significant gaps in readiness that will cost shortlisting opportunities.';
    }
    if (key === 'flexibilityConstraints') {
      if (score >= 7) return 'Flexible on role type, location, and structure.';
      if (score >= 5) return 'Some flexibility — constraints may limit opportunity volume.';
      return 'Rigid constraints are reducing the pool of accessible opportunities.';
    }
    if (key === 'improvementIntent') {
      if (score >= 7) return 'High motivation to upskill and course-correct.';
      if (score >= 5) return 'Some willingness to improve — needs a structured plan.';
      return 'Low action intent may slow down meaningful progress.';
    }
    return '';
  }

  const rows: { key: keyof SectionScores | 'linkedin'; label: string; score: number }[] = [
    { key: 'linkedin', label: 'LinkedIn Profile Strength', score: li },
    { key: 'careerDirection', label: 'Career Direction', score: s.careerDirection },
    { key: 'jobSearchBehavior', label: 'Job Search Behavior', score: s.jobSearchBehavior },
    { key: 'opportunityReadiness', label: 'Opportunity Readiness', score: s.opportunityReadiness },
    { key: 'flexibilityConstraints', label: 'Flexibility & Constraints', score: s.flexibilityConstraints },
    { key: 'improvementIntent', label: 'Improvement Intent', score: s.improvementIntent },
  ];

  return rows.map(({ key, label, score }) => {
    const status = statusFor(score);
    return {
      label,
      score,
      status,
      statusColor: colorFor(status),
      remark: remarkFor(key, score),
    };
  });
}

// ─── Top 3 gaps ───────────────────────────────────────────────────────────────

export interface Gap {
  title: string;
  description: string;
}

export function buildTopGaps(evaluation: FinalScore, candidate: CandidateDetails): Gap[] {
  const gaps: Gap[] = [];
  const s = evaluation.sectionScores;
  const li = evaluation.linkedInScore;
  const pa = evaluation.linkedInAnalysis?.profileAnalysis ?? null;

  if (li < 6) {
    gaps.push({
      title: 'LinkedIn Profile Not Recruiter-Ready',
      description: `Your LinkedIn score of ${li.toFixed(1)}/10 means recruiters running searches for ${candidate.jobRole} roles are unlikely to find — or shortlist — you. Profile completeness, headline clarity, and proof-of-work signals are the primary culprits.`,
    });
  }

  if (s.careerDirection < 5.5) {
    gaps.push({
      title: 'Unclear Career Direction',
      description: 'Your responses indicate ambiguity around target role, industry, or career level. Recruiters prioritise candidates who signal precision — vague positioning directly reduces shortlisting probability.',
    });
  }

  if (s.jobSearchBehavior < 5.5) {
    gaps.push({
      title: 'Inconsistent Job Search Behavior',
      description: 'Application patterns suggest a reactive rather than strategic approach. Without a structured outreach cadence, high-fit opportunities are being missed or ignored.',
    });
  }

  if (s.opportunityReadiness < 5.5) {
    gaps.push({
      title: 'Low Interview & Opportunity Readiness',
      description: 'Preparation gaps in portfolio, referrals, or interview practice mean that even if shortlisted, conversion to offer is at risk. Readiness is a multiplier on all other scores.',
    });
  }

  if (pa && pa.proof_of_work_visibility < 5) {
    gaps.push({
      title: 'No Visible Proof of Work',
      description: 'Hiring managers cannot verify capability without tangible output. The absence of case studies, featured projects, or portfolio links significantly reduces perceived credibility.',
    });
  }

  if (s.improvementIntent < 4.5) {
    gaps.push({
      title: 'Low Action Orientation',
      description: 'Responses suggest a passive orientation toward improvement. Without deliberate upskilling or structured outreach, your employability score is unlikely to improve independently.',
    });
  }

  return gaps.slice(0, 3);
}

// ─── LinkedIn insight sentence ────────────────────────────────────────────────

export function buildLinkedInInsight(evaluation: FinalScore, candidate: CandidateDetails): string {
  const pa = evaluation.linkedInAnalysis?.profileAnalysis ?? null;
  const score = evaluation.linkedInScore;

  if (!pa) {
    const suffix = score < 5
      ? ' Your LinkedIn presence is currently a net drag on shortlisting probability.'
      : score < 7.5
      ? ' With targeted improvements, your profile can become a reliable inbound source of recruiter interest.'
      : ' Your LinkedIn profile is a genuine asset — small refinements will push it into top-decile territory.';
    return `Your LinkedIn profile for ${candidate.jobRole} roles has been assessed.${suffix}`;
  }

  const parts: string[] = [];

  if (pa.headline_clarity < 5) {
    parts.push(`Your headline is likely too generic to surface in recruiter keyword searches for ${candidate.jobRole} roles`);
  } else if (pa.headline_clarity >= 8) {
    parts.push('Your headline has strong role-specific clarity, which helps recruiter search visibility');
  } else {
    parts.push('Your headline has partial clarity but could better position you for targeted role searches');
  }

  if (pa.proof_of_work_visibility < 5) {
    parts.push('no visible proof of work reduces shortlisting confidence for hiring managers');
  } else if (pa.proof_of_work_visibility >= 7) {
    parts.push('visible proof of work adds credibility that differentiates you from comparable candidates');
  }

  if (pa.activity_visibility < 5) {
    parts.push('low platform activity means your profile rarely surfaces in recruiter discovery feeds');
  } else if (pa.activity_visibility >= 7) {
    parts.push('your activity level keeps your profile visible to both active and passive talent searches');
  }

  const base = parts.length >= 2
    ? `${parts[0]}; ${parts[1]}.`
    : `${parts[0]}.`;

  const suffix = score < 5
    ? ' Overall, your LinkedIn presence is currently a net drag on shortlisting probability.'
    : score < 7.5
    ? ' With targeted improvements, your profile can become a reliable inbound source of recruiter interest.'
    : ' Your LinkedIn profile is a genuine asset — small refinements will push it into top-decile territory.';

  return base + suffix;
}

// ─── Behavioral insight ───────────────────────────────────────────────────────

export function buildBehavioralInsight(evaluation: FinalScore): string {
  const s = evaluation.sectionScores;
  const avgBehavior = (s.jobSearchBehavior + s.improvementIntent + s.opportunityReadiness) / 3;

  if (avgBehavior >= 7.5) {
    return 'Your diagnostic responses reflect strong job search discipline — consistent application behavior, interview preparation, and a clear intent to improve. This behavioral profile significantly amplifies the impact of any profile improvements you make.';
  }
  if (avgBehavior >= 5.5) {
    return 'Your job search behavior shows moderate consistency with identifiable gaps in readiness and follow-through. You are taking action, but the approach lacks the structure and precision that accelerates shortlisting outcomes in competitive markets.';
  }
  if (avgBehavior >= 3.5) {
    return 'Your responses suggest a reactive job search pattern — applying when motivated, but without a systematic cadence or preparation strategy. This inconsistency is likely limiting your shortlisting rate more than any profile or skills gap.';
  }
  return 'Your diagnostic responses indicate a largely passive orientation toward the job search. Without deliberate behavioral change — structured outreach, preparation routines, and accountability — external improvements to your profile will have limited conversion impact.';
}

// ─── Risk projection ──────────────────────────────────────────────────────────

export function buildRiskProjection(_evaluation: FinalScore, band: ScoreBand): string {
  if (band === 'critical') {
    return 'Without intervention, candidates at this score level typically remain in the same job search cycle for 6–18 months, accruing rejection without understanding the root cause. Each month of inaction increases the perceived "gap" on your profile and reduces the leverage of your current experience.';
  }
  if (band === 'needs_optimization') {
    return 'Candidates in this band frequently receive recruiter views but fail to convert to interviews. The gap between interest and action is widest here — small, targeted changes produce disproportionate shortlisting gains. Without a structured improvement plan, this band tends to persist for 3–9 months.';
  }
  return 'At this score level, the primary risk is complacency. Your profile is competitive, but the market is dynamic — roles, keywords, and recruiter filters evolve. Candidates who actively maintain and refine their profile consistently outperform those who assume a strong baseline is sufficient.';
}

// ─── Recruiter view insight ───────────────────────────────────────────────────

export function buildRecruiterView(evaluation: FinalScore, candidate: CandidateDetails): string {
  const score = evaluation.finalEmployabilityScore;
  const pa = evaluation.linkedInAnalysis?.profileAnalysis ?? null;

  const headlineQ = pa ? (pa.headline_clarity >= 6 ? 'clear' : 'unclear') : 'unassessed';
  const proofQ = pa
    ? (pa.proof_of_work_visibility >= 6 ? 'with visible proof of work' : 'without visible proof of work')
    : 'with unassessed proof of work';

  if (score < 5) {
    return `A recruiter reviewing ${candidate.name}'s profile today would likely scroll past — the ${headlineQ} headline, ${proofQ}, and inconsistent job search signals collectively fail to meet the threshold for shortlisting consideration in a competitive ${candidate.jobRole} pipeline.`;
  }
  if (score < 7.5) {
    return `A recruiter reviewing ${candidate.name}'s profile today would find it credible but not compelling — the ${headlineQ} headline and ${proofQ} create moderate interest, but the profile does not stand out enough to guarantee a callback in a strong candidate pool.`;
  }
  return `A recruiter reviewing ${candidate.name}'s profile today would likely add it to the shortlist — the ${headlineQ} headline and ${proofQ} position this candidate as a serious contender. Targeted refinements would move it from shortlist-worthy to interview-priority.`;
}

// ─── Recommendation paragraph ─────────────────────────────────────────────────

export function buildRecommendation(evaluation: FinalScore, candidate: CandidateDetails): string {
  const s = evaluation.sectionScores;
  const weakest = (Object.entries(s) as [keyof SectionScores, number][])
    .sort(([, a], [, b]) => a - b)[0][0];

  const focusMap: Record<keyof SectionScores, string> = {
    careerDirection: 'define a precise target role and communicate it consistently across every touchpoint',
    jobSearchBehavior: 'move to a structured weekly outreach cadence of at least 10–15 targeted applications',
    opportunityReadiness: 'build a portfolio or achievement library before your next application round',
    flexibilityConstraints: 'review your constraints and identify where increased flexibility unlocks meaningful opportunity volume',
    improvementIntent: 'commit to a 30-day structured improvement sprint with clear weekly milestones',
  };

  const liAction = evaluation.linkedInScore < 6
    ? 'Prioritize a complete LinkedIn profile rewrite — headline, About section, and featured content — before ramping up applications. '
    : evaluation.linkedInScore < 7.5
    ? 'Make targeted LinkedIn improvements to headline clarity and proof-of-work visibility this week. '
    : 'Maintain your LinkedIn profile with monthly updates to stay in recruiter discovery feeds. ';

  return `${liAction}Beyond LinkedIn, the single highest-leverage action for ${candidate.name} right now is to ${focusMap[weakest]}. Do not attempt to improve everything simultaneously — sequence your effort by impact, starting with the weakest dimension identified above.`;
}
