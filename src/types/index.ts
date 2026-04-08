// ─── Candidate & Lead ───────────────────────────────────────────────────────

export type CareerStage = 'fresher' | 'working_professional';

export interface CandidateDetails {
  name: string;
  email: string;
  phone: string;
  location: string;
  jobRole: string;
  yearsExperience: string;
  careerStage: CareerStage | '';
  industry: string;
  linkedinUrl: string;
  linkedinHeadline?: string;
  linkedinAboutText?: string;
  linkedinExperienceText?: string;
  linkedinAchievements?: string;
}

export interface Lead extends CandidateDetails {
  id: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentRef: string;
  createdAt: string;
}

export type PaymentVerificationState =
  | 'INITIATED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'FAILED'
  | 'UNKNOWN';


// ─── Diagnostic ─────────────────────────────────────────────────────────────

export interface BackendDiagnosticAnswer {
  questionCode: string;
  selectedOptionCode: string;
}

export type QuestionCategory =
  | 'profile_visibility'
  | 'application_strategy'
  | 'experience_credentials'
  | 'network_strength'
  | 'content_portfolio';

export interface QuestionOption {
  label: string;
  value: string;
  score: number;
}

export interface DiagnosticQuestion {
  id: number;
  category: QuestionCategory;
  question: string;
  options: QuestionOption[];
  weight: number;
}

export interface DiagnosticAnswer {
  questionId: number;
  value: string;
  score: number;
  category: QuestionCategory;
}

// ─── Scores & Report ────────────────────────────────────────────────────────

export type ScoreLevel = 'critical' | 'low' | 'moderate' | 'strong' | 'excellent';

export interface CategoryScore {
  category: QuestionCategory;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: ScoreLevel;
}

export interface ReportFinding {
  type: 'critical' | 'warning' | 'positive';
  title: string;
  description: string;
}

export interface ReportRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

export interface ReportData {
  leadId: string;
  sessionId: string;
  candidateName: string;
  overallScore: number;
  scoreLevel: ScoreLevel;
  scoreLabel: string;
  categoryScores: CategoryScore[];
  findings: ReportFinding[];
  recommendations: ReportRecommendation[];
  generatedAt: string;
}

// ─── Session / DB ────────────────────────────────────────────────────────────

export interface DiagnosticSession {
  id: string;
  leadId: string;
  answers: DiagnosticAnswer[];
  overallScore: number;
  categoryScores: Record<QuestionCategory, number>;
  status: 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

// ─── Flow State ──────────────────────────────────────────────────────────────

export type FlowStep =
  | 'landing'
  | 'checkout'
  | 'details'
  | 'diagnostic'
  | 'analysis'
  | 'report'
  | 'booking';

export interface BookingDetails {
  date: string;
  time: string;
  notes: string;
  bookedAt: string;
  bookingRef: string;
}

export type AnalysisRunStatus = 'idle' | 'triggered' | 'polling' | 'completed' | 'failed';

export interface FlowState {
  step: FlowStep;
  paymentCompleted: boolean;
  paymentRef: string | null;
  paymentOrderId: string | null;
  paymentGatewayOrderId: string | null;
  paymentGatewayPaymentId: string | null;
  paymentGatewaySignature: string | null;
  paymentVerificationState: PaymentVerificationState;
  candidateDetails: CandidateDetails | null;
  candidateCode: string | null;
  linkedinUrlError: string | null;
  answers: DiagnosticAnswer[];
  backendAnswers: BackendDiagnosticAnswer[];
  diagnosticSubmitted: boolean;
  analysisStatus: AnalysisRunStatus;
  reportData: ReportData | null;
  evaluation: FinalScore | null;
  leadId: string | null;
  sessionId: string | null;
  consultationBooked: boolean;
  bookingDetails: BookingDetails | null;
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

export type ScoreBand = 'critical' | 'needs_optimization' | 'strong';

export interface SectionScores {
  careerDirection: number;
  jobSearchBehavior: number;
  opportunityReadiness: number;
  flexibilityConstraints: number;
  improvementIntent: number;
}

export interface LinkedInProfileAnalysis {
  headline_clarity: number;
  role_clarity: number;
  profile_completeness: number;
  about_quality: number;
  experience_presentation: number;
  proof_of_work_visibility: number;
  certifications_signal: number;
  recommendation_signal: number;
  activity_visibility: number;
  career_consistency: number;
  growth_progression: number;
  differentiation_strength: number;
  recruiter_attractiveness: number;
  summary_notes: string[];
  top_strengths: string[];
  top_concerns: string[];
}

export interface LinkedInAnalysis {
  score: number;
  headline: string;
  completeness: number;
  activityLevel: 'low' | 'moderate' | 'high';
  connectionStrength: 'weak' | 'moderate' | 'strong';
  keywordOptimization: number;
  profileAnalysis: LinkedInProfileAnalysis;
  isMock: true;
}

export type CrmTag =
  | 'career_clarity_low'
  | 'job_search_inconsistent'
  | 'interview_readiness_low'
  | 'flexibility_low'
  | 'high_intent'
  | 'warm_lead'
  | 'low_action_intent'
  | 'proof_of_work_low'
  | 'salary_expectation_risk'
  | 'consultation_priority'
  | 'nurture_after_report'
  | 'low_immediate_conversion'
  | 'high_pain_lead'
  | 'warm_diagnostic_lead'
  | 'premium_lead';

export interface FinalScore {
  linkedInScore: number;
  sectionScores: SectionScores;
  finalEmployabilityScore: number;
  band: ScoreBand;
  bandLabel: string;
  tags: CrmTag[];
  linkedInAnalysis: LinkedInAnalysis;
  computedAt: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  jobRole: string;
  yearsExperience: string;
  careerStage: string;
  industry: string;
  linkedinUrl: string;
  paymentStatus: string;
  overallScore?: number;
  scoreLevel?: ScoreLevel;
  createdAt: string;
}
