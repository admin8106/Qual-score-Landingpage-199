import { DiagnosticQuestion, QuestionCategory } from '../types';

export interface DiagnosticSection {
  id: string;
  label: string;
  letter: string;
  questionIds: number[];
  category: QuestionCategory;
}

export const DIAGNOSTIC_SECTIONS: DiagnosticSection[] = [
  {
    id: 'career_direction',
    label: 'Career Direction',
    letter: 'A',
    questionIds: [1, 2, 3],
    category: 'application_strategy',
  },
  {
    id: 'job_search_behavior',
    label: 'Job Search Behavior',
    letter: 'B',
    questionIds: [4, 5, 6],
    category: 'application_strategy',
  },
  {
    id: 'opportunity_readiness',
    label: 'Opportunity Readiness',
    letter: 'C',
    questionIds: [7, 8, 9],
    category: 'experience_credentials',
  },
  {
    id: 'flexibility_constraints',
    label: 'Flexibility & Constraints',
    letter: 'D',
    questionIds: [10, 11, 12],
    category: 'profile_visibility',
  },
  {
    id: 'improvement_intent',
    label: 'Improvement Intent',
    letter: 'E',
    questionIds: [13, 14, 15],
    category: 'network_strength',
  },
];

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ── Section A: Career Direction ──────────────────────────────────────────────
  {
    id: 1,
    category: 'application_strategy',
    weight: 1.2,
    question: 'Which role are you actively targeting right now?',
    options: [
      { label: 'Same as my current or most recent role', value: 'same_role', score: 10 },
      { label: 'A slightly advanced version of my current role', value: 'advanced_role', score: 7 },
      { label: 'A different role within the same domain', value: 'different_role', score: 4 },
      { label: 'I am still exploring multiple unrelated roles', value: 'exploring', score: 1 },
    ],
  },
  {
    id: 2,
    category: 'application_strategy',
    weight: 1.2,
    question: 'Which best describes your current job search goal?',
    options: [
      { label: 'I am urgently looking for a job', value: 'urgent', score: 10 },
      { label: 'I am looking for better growth opportunities', value: 'growth', score: 7 },
      { label: 'I am exploring the market casually', value: 'casual', score: 4 },
      { label: 'I am not actively searching, only checking my standing', value: 'passive', score: 1 },
    ],
  },
  {
    id: 3,
    category: 'application_strategy',
    weight: 1.3,
    question: 'What do you think is the biggest reason you are not getting enough interview calls?',
    options: [
      { label: 'My profile is not positioned strongly enough', value: 'profile_weak', score: 10 },
      { label: 'My skills may not match market demand well enough', value: 'skills_gap', score: 7 },
      { label: 'My visibility and recruiter reach are low', value: 'low_visibility', score: 7 },
      { label: 'I am not sure what the exact issue is', value: 'unsure', score: 1 },
    ],
  },

  // ── Section B: Job Search Behavior ──────────────────────────────────────────
  {
    id: 4,
    category: 'application_strategy',
    weight: 1.2,
    question: 'On average, how many relevant jobs do you apply to in a week?',
    options: [
      { label: '15 or more', value: '15_plus', score: 10 },
      { label: '8 to 14', value: '8_to_14', score: 7 },
      { label: '3 to 7', value: '3_to_7', score: 4 },
      { label: '0 to 2', value: '0_to_2', score: 1 },
    ],
  },
  {
    id: 5,
    category: 'application_strategy',
    weight: 1.3,
    question: 'How do you usually apply for opportunities?',
    options: [
      { label: 'Through both job portals and networking/referrals', value: 'both_channels', score: 10 },
      { label: 'Mostly through LinkedIn or job portals', value: 'portals_only', score: 7 },
      { label: 'Mostly through referrals or personal contacts only', value: 'referrals_only', score: 4 },
      { label: 'I apply inconsistently without a fixed approach', value: 'inconsistent', score: 1 },
    ],
  },
  {
    id: 6,
    category: 'application_strategy',
    weight: 1.2,
    question: 'After applying for a role, what do you usually do next?',
    options: [
      { label: 'I follow up or try to connect with recruiters consistently', value: 'consistent_followup', score: 10 },
      { label: 'I track applications and follow up selectively', value: 'selective_followup', score: 7 },
      { label: 'I usually wait for a response', value: 'wait', score: 4 },
      { label: 'I usually do nothing further', value: 'nothing', score: 1 },
    ],
  },

  // ── Section C: Opportunity Readiness ────────────────────────────────────────
  {
    id: 7,
    category: 'experience_credentials',
    weight: 1.3,
    question: 'If you get shortlisted tomorrow, how prepared are you for interviews?',
    options: [
      { label: 'Fully ready', value: 'fully_ready', score: 10 },
      { label: 'Mostly ready, with slight preparation needed', value: 'mostly_ready', score: 7 },
      { label: 'I need significant preparation', value: 'needs_prep', score: 4 },
      { label: 'I am not ready at all', value: 'not_ready', score: 1 },
    ],
  },
  {
    id: 8,
    category: 'content_portfolio',
    weight: 1.2,
    question: 'Which best describes your proof of work beyond LinkedIn?',
    options: [
      { label: 'Strong portfolio, projects, or measurable achievements', value: 'strong_proof', score: 10 },
      { label: 'Some visible proof exists, but it is not well organized', value: 'partial_proof', score: 7 },
      { label: 'I have limited proof of work', value: 'limited_proof', score: 4 },
      { label: 'I do not have strong proof available', value: 'no_proof', score: 1 },
    ],
  },
  {
    id: 9,
    category: 'experience_credentials',
    weight: 1.2,
    question: 'How clearly can you explain your work impact in interviews?',
    options: [
      { label: 'Very clearly, with examples and measurable impact', value: 'very_clearly', score: 10 },
      { label: 'Fairly clearly', value: 'fairly_clearly', score: 7 },
      { label: 'Only at a basic level', value: 'basic_level', score: 4 },
      { label: 'I struggle to explain it confidently', value: 'struggle', score: 1 },
    ],
  },

  // ── Section D: Flexibility & Constraints ────────────────────────────────────
  {
    id: 10,
    category: 'profile_visibility',
    weight: 1.0,
    question: 'Which work setup are you open to?',
    options: [
      { label: 'Open to on-site, hybrid, and remote', value: 'all_setups', score: 10 },
      { label: 'Open to hybrid and remote only', value: 'hybrid_remote', score: 7 },
      { label: 'Open to on-site only', value: 'onsite_only', score: 4 },
      { label: 'I have very restricted preferences', value: 'restricted', score: 1 },
    ],
  },
  {
    id: 11,
    category: 'profile_visibility',
    weight: 1.0,
    question: 'Are you open to changing city or location for the right opportunity?',
    options: [
      { label: 'Yes', value: 'yes_relocate', score: 10 },
      { label: 'Maybe, depending on the role', value: 'maybe_relocate', score: 7 },
      { label: 'Only within my current city or region', value: 'local_only', score: 4 },
      { label: 'No', value: 'no_relocate', score: 1 },
    ],
  },
  {
    id: 12,
    category: 'profile_visibility',
    weight: 1.1,
    question: 'Which best describes your salary expectation right now?',
    options: [
      { label: 'It is realistic for my profile and current market', value: 'realistic', score: 10 },
      { label: 'It is slightly ambitious but still reasonable', value: 'slightly_ambitious', score: 7 },
      { label: 'I am not sure what is realistic', value: 'unsure_salary', score: 4 },
      { label: 'It may be higher than what the market would currently support', value: 'too_high', score: 1 },
    ],
  },

  // ── Section E: Improvement Intent ───────────────────────────────────────────
  {
    id: 13,
    category: 'network_strength',
    weight: 1.2,
    question: 'Which area do you believe needs the most improvement for better shortlisting?',
    options: [
      { label: 'Profile positioning and presentation', value: 'profile_positioning', score: 10 },
      { label: 'Skills and role alignment', value: 'skills_alignment', score: 7 },
      { label: 'Interview readiness and confidence', value: 'interview_readiness', score: 7 },
      { label: 'I am not sure what exactly needs improvement', value: 'unsure_gap', score: 1 },
    ],
  },
  {
    id: 14,
    category: 'network_strength',
    weight: 1.2,
    question: 'How actively are you working on improving your employability right now?',
    options: [
      { label: 'Very actively and consistently', value: 'very_actively', score: 10 },
      { label: 'Somewhat actively', value: 'somewhat_actively', score: 7 },
      { label: 'Occasionally', value: 'occasionally', score: 4 },
      { label: 'Hardly at all', value: 'hardly', score: 1 },
    ],
  },
  {
    id: 15,
    category: 'network_strength',
    weight: 1.3,
    question: 'If your diagnostic report shows clear gaps, what are you most likely to do next?',
    options: [
      { label: 'Book a detailed evaluation and work on improvement', value: 'book_eval', score: 10 },
      { label: 'Study the gaps first and then decide', value: 'study_first', score: 7 },
      { label: 'Try to fix things on my own without further support', value: 'self_fix', score: 4 },
      { label: 'Probably do nothing immediately', value: 'do_nothing', score: 1 },
    ],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  profile_visibility: 'Flexibility & Constraints',
  application_strategy: 'Job Search Behavior',
  experience_credentials: 'Opportunity Readiness',
  network_strength: 'Improvement Intent',
  content_portfolio: 'Proof of Work',
};

export const SECTION_CATEGORY_LABELS: Record<string, string> = {
  career_direction: 'Career Direction',
  job_search_behavior: 'Job Search Behavior',
  opportunity_readiness: 'Opportunity Readiness',
  flexibility_constraints: 'Flexibility & Constraints',
  improvement_intent: 'Improvement Intent',
};

export const TOTAL_QUESTIONS = DIAGNOSTIC_QUESTIONS.length;

export function getSectionForQuestion(questionId: number): DiagnosticSection | undefined {
  return DIAGNOSTIC_SECTIONS.find((s) => s.questionIds.includes(questionId));
}
