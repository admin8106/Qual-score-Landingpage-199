import { DiagnosticAnswer, CategoryScore, QuestionCategory, ScoreLevel, ReportFinding, ReportRecommendation } from '../types';
import { DIAGNOSTIC_QUESTIONS, CATEGORY_LABELS } from '../constants/questions';

const CATEGORY_ORDER: QuestionCategory[] = [
  'profile_visibility',
  'application_strategy',
  'experience_credentials',
  'network_strength',
  'content_portfolio',
];

function getScoreLevel(percentage: number): ScoreLevel {
  if (percentage < 30) return 'critical';
  if (percentage < 50) return 'low';
  if (percentage < 65) return 'moderate';
  if (percentage < 80) return 'strong';
  return 'excellent';
}

export function calculateCategoryScores(answers: DiagnosticAnswer[]): CategoryScore[] {
  const categoryData: Record<string, { weighted: number; maxWeighted: number }> = {};

  CATEGORY_ORDER.forEach((cat) => {
    categoryData[cat] = { weighted: 0, maxWeighted: 0 };
  });

  DIAGNOSTIC_QUESTIONS.forEach((q) => {
    const answer = answers.find((a) => a.questionId === q.id);
    const maxScore = Math.max(...q.options.map((o) => o.score));
    categoryData[q.category].maxWeighted += maxScore * q.weight;
    if (answer) {
      categoryData[q.category].weighted += answer.score * q.weight;
    }
  });

  return CATEGORY_ORDER.map((cat) => {
    const { weighted, maxWeighted } = categoryData[cat];
    const percentage = maxWeighted > 0 ? Math.round((weighted / maxWeighted) * 100) : 0;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      score: Math.round(weighted),
      maxScore: Math.round(maxWeighted),
      percentage,
      level: getScoreLevel(percentage),
    };
  });
}

export function calculateOverallScore(categoryScores: CategoryScore[]): number {
  if (categoryScores.length === 0) return 0;
  const avg = categoryScores.reduce((sum, c) => sum + c.percentage, 0) / categoryScores.length;
  return Math.round(avg);
}

export function getScoreLabel(score: number): string {
  if (score < 30) return 'Critical — Immediate Action Required';
  if (score < 50) return 'Below Average — Significant Gaps Identified';
  if (score < 65) return 'Moderate — Improvement Areas Detected';
  if (score < 80) return 'Strong — Minor Refinements Needed';
  return 'Excellent — Highly Employable Profile';
}

export function generateFindings(
  answers: DiagnosticAnswer[],
  categoryScores: CategoryScore[]
): ReportFinding[] {
  const findings: ReportFinding[] = [];
  const answerMap = Object.fromEntries(answers.map((a) => [a.questionId, a]));

  const profileScore = categoryScores.find((c) => c.category === 'profile_visibility');
  const appScore = categoryScores.find((c) => c.category === 'application_strategy');
  const networkScore = categoryScores.find((c) => c.category === 'network_strength');
  const portfolioScore = categoryScores.find((c) => c.category === 'content_portfolio');

  if (profileScore && profileScore.percentage < 50) {
    findings.push({
      type: 'critical',
      title: 'LinkedIn Profile Not Recruiter-Ready',
      description:
        'Your LinkedIn profile is incomplete or outdated. Recruiters actively source candidates via LinkedIn — a weak profile means you are invisible to 70% of hiring opportunities.',
    });
  }

  if (appScore && appScore.percentage < 40) {
    findings.push({
      type: 'critical',
      title: 'Low Shortlisting Rate Detected',
      description:
        'Your application-to-response ratio is below industry benchmarks. This signals a mismatch between how you present yourself and what recruiters are scanning for.',
    });
  }

  if (networkScore && networkScore.percentage < 50) {
    findings.push({
      type: 'warning',
      title: 'Weak Professional Network',
      description:
        'A limited or inactive LinkedIn network reduces your referral potential and limits inbound opportunities from recruiters who rely on mutual connections.',
    });
  }

  if (portfolioScore && portfolioScore.percentage < 50) {
    findings.push({
      type: 'warning',
      title: 'No Proof of Work Visible',
      description:
        'Candidates with portfolios, case studies, or GitHub profiles get shortlisted 2–3x more often. Hiring managers want evidence, not just claims.',
    });
  }

  const q2Answer = answerMap[2];
  if (q2Answer && (q2Answer.value === '0-10' || q2Answer.value === '11-25')) {
    findings.push({
      type: 'warning',
      title: 'Resume Not Passing Initial Screening',
      description:
        'A response rate below 25% typically indicates your resume is not passing ATS filters or lacks keyword alignment with job descriptions.',
    });
  }

  const q5Answer = answerMap[5];
  if (q5Answer && (q5Answer.value === 'rarely' || q5Answer.value === 'never')) {
    findings.push({
      type: 'warning',
      title: 'Generic Resume Strategy Hurting Chances',
      description:
        'Using the same resume for every application significantly reduces match scores in ATS systems and signals low intent to recruiters.',
    });
  }

  const q14Answer = answerMap[14];
  if (q14Answer && (q14Answer.value === 'rarely' || q14Answer.value === 'never')) {
    findings.push({
      type: 'warning',
      title: 'Zero LinkedIn Presence or Thought Leadership',
      description:
        'Passive LinkedIn usage means you never appear in recruiter feeds. Regular content engagement dramatically increases profile views and recruiter outreach.',
    });
  }

  const positiveScores = categoryScores.filter((c) => c.percentage >= 70);
  positiveScores.forEach((cat) => {
    findings.push({
      type: 'positive',
      title: `Strong ${cat.label}`,
      description: `Your ${cat.label.toLowerCase()} score is above average. This is a competitive advantage — maintain and leverage it actively in your job search.`,
    });
  });

  return findings;
}

export function generateRecommendations(
  categoryScores: CategoryScore[],
  overallScore: number
): ReportRecommendation[] {
  const recs: ReportRecommendation[] = [];

  const sorted = [...categoryScores].sort((a, b) => a.percentage - b.percentage);

  sorted.forEach((cat) => {
    if (cat.percentage < 50) {
      if (cat.category === 'profile_visibility') {
        recs.push({
          priority: 'high',
          title: 'Rebuild Your LinkedIn Profile to All-Star Status',
          description:
            'Recruiters screen LinkedIn before email. Ensure a professional photo, keyword-optimized headline, quantified experience bullets, and at least 3 skills endorsements.',
          action: 'Complete all LinkedIn sections and optimize for your target role keywords within 7 days.',
        });
      }
      if (cat.category === 'application_strategy') {
        recs.push({
          priority: 'high',
          title: 'Revamp Your Resume for ATS Compatibility',
          description:
            'Your application strategy needs a complete overhaul. Tailor each resume to the job description, use industry-standard formatting, and mirror the language of job postings.',
          action: 'Rewrite your resume using a job-specific template. Apply to 10 highly matched roles before broad applications.',
        });
      }
      if (cat.category === 'network_strength') {
        recs.push({
          priority: 'high',
          title: 'Build a Targeted Professional Network',
          description:
            'Connect with 5 relevant professionals per day — hiring managers, peers in target companies, and industry leaders. Personalize your connection requests.',
          action: 'Send 25 targeted connection requests this week. Join 2 industry-relevant LinkedIn groups.',
        });
      }
      if (cat.category === 'content_portfolio') {
        recs.push({
          priority: 'high',
          title: 'Create Visible Proof of Your Work',
          description:
            'Build or update your portfolio, publish 1 case study on LinkedIn, or make your GitHub public. Tangible evidence of work converts profile views into interview calls.',
          action: 'Publish one project or insight post on LinkedIn within 5 days.',
        });
      }
    } else if (cat.percentage < 70) {
      if (cat.category === 'profile_visibility') {
        recs.push({
          priority: 'medium',
          title: 'Optimize LinkedIn for Search Discoverability',
          description:
            "Your profile exists but may not be ranking for the right keywords. Use LinkedIn's Creator Mode, add a featured section, and enable Open to Work for recruiters.",
          action: 'Run a keyword gap analysis on your profile vs. 5 target job descriptions.',
        });
      }
      if (cat.category === 'application_strategy') {
        recs.push({
          priority: 'medium',
          title: 'Improve Application Targeting and Resume Tailoring',
          description:
            'Shift from volume-based to precision-based applications. Apply to 15–20 highly relevant roles with customized resumes rather than blasting 100+ generic applications.',
          action: 'Identify your top 3 target companies and craft role-specific applications this week.',
        });
      }
    }
  });

  if (overallScore < 60) {
    recs.push({
      priority: 'high',
      title: 'Get a Professional QualScore Evaluation',
      description:
        'Your overall employability score indicates structural gaps that a self-guided approach may not fully address. A structured evaluation by a QualScore expert can identify blind spots and create a prioritized 30-day action plan.',
      action: 'Book a 30-minute QualScore consultation to get your personalized roadmap.',
    });
  }

  return recs.slice(0, 5);
}
