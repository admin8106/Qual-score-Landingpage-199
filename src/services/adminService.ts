import type { AdminLeadRecord, AdminLeadDetail } from '../api/services/admin';

// ─── Re-export API types under the names the page layer uses ─────────────────

export type { AdminLeadRecord, AdminLeadDetail };

// ─── Display model (page-level) ───────────────────────────────────────────────
// Maps the camelCase backend DTO into a flattened shape that AdminPage and
// LeadDetailDrawer already consume.  No Supabase imports anywhere here.

export type ScoreBandKey = 'critical' | 'needs_optimization' | 'strong';

export function bandFromLabel(label: string | undefined): ScoreBandKey | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('critical') || l.includes('not competitive')) return 'critical';
  if (l.includes('needs') || l.includes('optimization')) return 'needs_optimization';
  if (l.includes('strong')) return 'strong';
  return null;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface AdminFilters {
  search: string;
  band: ScoreBandKey | 'all';
  consultationStatus: 'all' | 'booked' | 'not_booked';
  tag: string | 'all';
  careerStage: 'all' | 'fresher' | 'working_professional';
}

export const DEFAULT_FILTERS: AdminFilters = {
  search: '',
  band: 'all',
  consultationStatus: 'all',
  tag: 'all',
  careerStage: 'all',
};

// ─── Filter function ──────────────────────────────────────────────────────────

export function applyFilters(
  leads: AdminLeadRecord[],
  filters: AdminFilters,
): AdminLeadRecord[] {
  return leads.filter((l) => {
    const q = filters.search.toLowerCase();
    if (q) {
      const haystack = [l.fullName, l.email, l.currentRole, l.industry]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.band !== 'all') {
      if (bandFromLabel(l.bandLabel) !== filters.band) return false;
    }

    const isBooked = l.consultationBooked || (!!l.consultationStatus && l.consultationStatus !== 'NONE' && l.consultationStatus !== 'none');
    if (filters.consultationStatus === 'booked' && !isBooked) return false;
    if (filters.consultationStatus === 'not_booked' && isBooked) return false;

    if (filters.tag !== 'all') {
      if (!l.tags?.includes(filters.tag)) return false;
    }

    if (filters.careerStage !== 'all' && l.careerStage !== filters.careerStage) return false;

    return true;
  });
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export interface AdminStats {
  totalPurchases: number;
  completedDiagnostics: number;
  consultationBookings: number;
  highPainLeads: number;
  warmDiagnosticLeads: number;
  premiumLeads: number;
}

export function computeStats(leads: AdminLeadRecord[]): AdminStats {
  let completedDiagnostics = 0;
  let consultationBookings = 0;
  let highPainLeads = 0;
  let warmDiagnosticLeads = 0;
  let premiumLeads = 0;

  for (const l of leads) {
    if (l.reportStatus === 'COMPLETED' || l.reportStatus === 'completed') completedDiagnostics++;
    if (l.consultationBooked || (!!l.consultationStatus && l.consultationStatus !== 'NONE' && l.consultationStatus !== 'none')) consultationBookings++;
    const tags = l.tags ?? [];
    if (tags.includes('high_pain_lead')) highPainLeads++;
    if (tags.includes('warm_diagnostic_lead')) warmDiagnosticLeads++;
    if (tags.includes('premium_lead')) premiumLeads++;
  }

  return {
    totalPurchases: leads.length,
    completedDiagnostics,
    consultationBookings,
    highPainLeads,
    warmDiagnosticLeads,
    premiumLeads,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const BAND_LABELS: Record<ScoreBandKey, string> = {
  critical: 'Not Competitive',
  needs_optimization: 'Needs Optimization',
  strong: 'Strong',
};

export const BAND_COLORS: Record<ScoreBandKey, { bg: string; text: string; dot: string }> = {
  critical:           { bg: 'bg-red-500/12',     text: 'text-red-400',    dot: 'bg-red-400'    },
  needs_optimization: { bg: 'bg-amber-500/12',   text: 'text-amber-400',  dot: 'bg-amber-400'  },
  strong:             { bg: 'bg-emerald-500/12', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

export const TAG_LABELS: Record<string, string> = {
  career_clarity_low:        'Low Career Clarity',
  job_search_inconsistent:   'Inconsistent Search',
  interview_readiness_low:   'Low Interview Readiness',
  flexibility_low:           'Low Flexibility',
  high_intent:               'High Intent',
  warm_lead:                 'Warm Lead',
  low_action_intent:         'Low Action Intent',
  proof_of_work_low:         'Proof of Work Low',
  salary_expectation_risk:   'Salary Risk',
  consultation_priority:     'Consult Priority',
  nurture_after_report:      'Nurture',
  low_immediate_conversion:  'Low Conv.',
  high_pain_lead:            'High Pain',
  warm_diagnostic_lead:      'Warm Diagnostic',
  premium_lead:              'Premium',
};

export const TAG_COLORS: Record<string, string> = {
  career_clarity_low:        'bg-orange-500/10 text-orange-400',
  job_search_inconsistent:   'bg-orange-500/10 text-orange-400',
  interview_readiness_low:   'bg-orange-500/10 text-orange-400',
  flexibility_low:           'bg-orange-500/10 text-orange-400',
  high_intent:               'bg-emerald-500/10 text-emerald-400',
  warm_lead:                 'bg-blue-500/10 text-blue-400',
  low_action_intent:         'bg-red-500/10 text-red-400',
  proof_of_work_low:         'bg-red-500/10 text-red-400',
  salary_expectation_risk:   'bg-amber-500/10 text-amber-400',
  consultation_priority:     'bg-blue-500/10 text-blue-400',
  nurture_after_report:      'bg-slate-500/10 text-slate-400',
  low_immediate_conversion:  'bg-slate-500/10 text-slate-400',
  high_pain_lead:            'bg-red-500/10 text-red-400',
  warm_diagnostic_lead:      'bg-blue-500/10 text-blue-400',
  premium_lead:              'bg-emerald-500/10 text-emerald-400',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export const SECTION_LABELS: Record<string, string> = {
  careerDirectionScore:          'Career Direction',
  jobSearchBehaviorScore:        'Job Search Behavior',
  opportunityReadinessScore:     'Opportunity Readiness',
  flexibilityConstraintsScore:   'Flexibility & Constraints',
  improvementIntentScore:        'Improvement Intent',
  linkedinScore:                 'LinkedIn Profile',
};
