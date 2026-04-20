import { supabase } from '../lib/supabase';
import { CandidateDetails, DiagnosticAnswer, ReportData, CategoryScore, QuestionCategory, FinalScore } from '../types';
import { env } from '../config/env';

export async function createLead(details: CandidateDetails): Promise<string> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: details.name,
      email: details.email,
      phone: details.phone,
      linkedin_url: details.linkedinUrl,
      job_role: details.jobRole,
      years_experience: details.yearsExperience,
      location: details.location,
      career_stage: details.careerStage,
      industry: details.industry,
      payment_status: 'completed',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createDiagnosticSession(leadId: string): Promise<string> {
  const { data, error } = await supabase
    .from('diagnostic_sessions')
    .insert({ lead_id: leadId, status: 'in_progress' })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function saveDiagnosticResults(
  sessionId: string,
  answers: DiagnosticAnswer[],
  overallScore: number,
  categoryScores: CategoryScore[]
): Promise<void> {
  const catMap: Record<string, number> = {};
  categoryScores.forEach((c: CategoryScore) => {
    catMap[c.category as QuestionCategory] = c.percentage;
  });

  const { error } = await supabase
    .from('diagnostic_sessions')
    .update({
      answers,
      overall_score: overallScore,
      category_scores: catMap,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function saveReport(
  sessionId: string,
  leadId: string,
  reportData: ReportData
): Promise<string> {
  const { data, error } = await supabase
    .from('reports')
    .insert({ session_id: sessionId, lead_id: leadId, report_data: reportData })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function saveEvaluation(
  sessionId: string,
  leadId: string,
  evaluation: FinalScore
): Promise<void> {
  const { error: sessionErr } = await supabase
    .from('diagnostic_sessions')
    .update({
      final_employability_score: evaluation.finalEmployabilityScore,
      score_band: evaluation.band,
      linkedin_score: evaluation.linkedInScore,
      section_scores: evaluation.sectionScores,
      crm_tags: evaluation.tags,
      linkedin_analysis: evaluation.linkedInAnalysis,
    })
    .eq('id', sessionId);

  if (sessionErr) console.warn('[supabaseService] saveEvaluation session update error:', sessionErr.message);

  const { error: leadErr } = await supabase
    .from('leads')
    .update({
      final_employability_score: evaluation.finalEmployabilityScore,
      score_band: evaluation.band,
      crm_tags: evaluation.tags,
    })
    .eq('id', leadId);

  if (leadErr) console.warn('[supabaseService] saveEvaluation lead update error:', leadErr.message);
}

export async function fetchAdminLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id, name, email, phone, linkedin_url, job_role,
      years_experience, location, career_stage, industry,
      payment_status, final_employability_score, score_band, crm_tags, created_at,
      diagnostic_sessions (
        id, overall_score, status, completed_at,
        final_employability_score, score_band, linkedin_score,
        section_scores, crm_tags, linkedin_analysis
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchAdminConsultations() {
  const { data, error } = await supabase
    .from('consultations')
    .select('lead_id, session_id, preferred_date, preferred_time, booking_ref, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (env.isDev) console.warn('[supabaseService] fetchAdminConsultations error:', error.message);
    return [];
  }
  return data || [];
}
