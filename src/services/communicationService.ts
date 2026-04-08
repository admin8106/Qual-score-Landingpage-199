import { CandidateDetails, FinalScore, ReportData, ScoreBand, CrmTag } from '../types';
import { logCommEvent } from './commEventStore';
import { opFlags } from '../utils/opFlags';
import { env } from '../config/env';

const IS_DEV = env.isDev;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommChannel = 'whatsapp' | 'email' | 'crm' | 'internal';
export type CommTrigger =
  | 'report_generated'
  | 'report_viewed'
  | 'consultation_booked'
  | 'high_priority_lead_identified';

export interface CommCandidate {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  jobRole: string;
  yearsExperience: string;
  industry: string;
  careerStage: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  score: number;
  band: ScoreBand;
  bandLabel: string;
  tags: CrmTag[];
  reportViewedAt: string | null;
  consultationBooked: boolean;
  reportLink: string;
  bookingLink: string;
  triggeredAt: string;
}

export interface CrmEventPayload {
  eventType: CommTrigger;
  candidate: CommCandidate;
  metadata: {
    reportId: string | null;
    sessionId: string | null;
    leadId: string | null;
    bookingRef: string | null;
  };
  timestamp: string;
}

// ─── Message Templates ────────────────────────────────────────────────────────

/*
  WHATSAPP TEMPLATE 1 — Report Ready
  Trigger: report_generated
  Provider: Interakt / AiSensy / Wati (WhatsApp Business API)
  Template name: "report_ready_v1" (must match approved template name)

  "Hi [Name], your Employability Diagnostic Report is ready.
  Your Score: [Score]/10
  We've identified what's currently affecting your shortlisting.
  View your report: [Link]"
*/
export const WA_TEMPLATE_REPORT_READY = (c: CommCandidate) =>
  `Hi ${c.name}, your Employability Diagnostic Report is ready.\nYour Score: ${c.score.toFixed(1)}/10\nWe've identified what's currently affecting your shortlisting.\nView your report: ${c.reportLink}`;

/*
  WHATSAPP TEMPLATE 2 — Consultation Prompt
  Trigger: report_viewed (or 24h after report_generated if not viewed)
  Provider: Same as above
  Template name: "consultation_prompt_v1"

  "Based on your report, a few key gaps are likely affecting your interview calls.
  Book a quick consultation: [Link]"
*/
export const WA_TEMPLATE_CONSULTATION_PROMPT = (c: CommCandidate) =>
  `Based on your report, a few key gaps are likely affecting your interview calls.\nBook a quick consultation: ${c.bookingLink}`;

/*
  EMAIL TEMPLATE 1 — Report Ready
  Trigger: report_generated
  Subject: "Your Employability Diagnostic Report is Ready"
  Provider: Resend.com or SendGrid
  From: reports@qualscore.in
*/
export const EMAIL_TEMPLATE_REPORT_READY = {
  subject: 'Your Employability Diagnostic Report is Ready',
  preview: (c: CommCandidate) =>
    `Hi ${c.name}, your report is ready. Your Employability Score: ${c.score.toFixed(1)}/10. View it here: ${c.reportLink}`,
};

/*
  EMAIL TEMPLATE 2 — Shortlisting Issue
  Trigger: report_viewed (if band is critical or needs_optimization)
  Subject: "Why your profile may not be getting shortlisted"
  Provider: Same as above
  From: insights@qualscore.in
*/
export const EMAIL_TEMPLATE_SHORTLISTING_ISSUE = {
  subject: 'Why your profile may not be getting shortlisted',
  preview: (c: CommCandidate) =>
    `Hi ${c.name}, based on your diagnostic, here are the specific reasons recruiters may be passing over your profile — and how to fix them.`,
};

/*
  EMAIL TEMPLATE 3 — Urgency Follow-up
  Trigger: 48h after report_generated, if consultation not booked
  Subject: "Don't ignore this"
  Provider: Same as above
  From: team@qualscore.in
*/
export const EMAIL_TEMPLATE_URGENCY = {
  subject: "Don't ignore this",
  preview: (c: CommCandidate) =>
    `Hi ${c.name}, you completed your diagnostic but haven't taken the next step. Every week without addressing this costs you opportunities.`,
};

// ─── CRM payload builder ──────────────────────────────────────────────────────

export function buildCrmPayload(
  trigger: CommTrigger,
  candidate: CommCandidate,
  meta: { reportId?: string | null; sessionId?: string | null; leadId?: string | null; bookingRef?: string | null }
): CrmEventPayload {
  return {
    eventType: trigger,
    candidate,
    metadata: {
      reportId: meta.reportId ?? null,
      sessionId: meta.sessionId ?? null,
      leadId: meta.leadId ?? null,
      bookingRef: meta.bookingRef ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── Candidate builder helper ─────────────────────────────────────────────────

export function buildCommCandidate(
  details: CandidateDetails,
  evaluation: FinalScore,
  opts: {
    paymentStatus?: 'pending' | 'completed' | 'failed';
    reportViewedAt?: string | null;
    consultationBooked?: boolean;
    reportLink?: string;
    bookingLink?: string;
  } = {}
): CommCandidate {
  return {
    name: details.name,
    email: details.email,
    phone: details.phone,
    linkedinUrl: details.linkedinUrl,
    jobRole: details.jobRole,
    yearsExperience: details.yearsExperience,
    industry: details.industry,
    careerStage: details.careerStage,
    paymentStatus: opts.paymentStatus ?? 'completed',
    score: evaluation.finalEmployabilityScore,
    band: evaluation.band,
    bandLabel: evaluation.bandLabel,
    tags: evaluation.tags,
    reportViewedAt: opts.reportViewedAt ?? null,
    consultationBooked: opts.consultationBooked ?? false,
    reportLink: opts.reportLink ?? `${window.location.origin}/report`,
    bookingLink: opts.bookingLink ?? `${window.location.origin}/booking`,
    triggeredAt: new Date().toISOString(),
  };
}

// ─── Trigger methods (placeholders — real sending not yet implemented) ────────

export async function sendReportReadyWhatsApp(candidate: CommCandidate): Promise<void> {
  const message = WA_TEMPLATE_REPORT_READY(candidate);
  logCommEvent({
    trigger: 'report_generated',
    channel: 'whatsapp',
    recipient: candidate.phone || candidate.email,
    templateName: 'report_ready_v1',
    previewBody: message,
    status: 'would_fire',
    note: 'WhatsApp Business API not yet integrated. Provider: Interakt / AiSensy / Wati.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] sendReportReadyWhatsApp', 'color:#25D366;font-weight:bold');
    console.log('Recipient:', candidate.phone);
    console.log('Template:', 'report_ready_v1');
    console.log('Preview:\n', message);
    console.groupEnd();
  }
}

export async function sendReportReadyEmail(candidate: CommCandidate): Promise<void> {
  const preview = EMAIL_TEMPLATE_REPORT_READY.preview(candidate);
  logCommEvent({
    trigger: 'report_generated',
    channel: 'email',
    recipient: candidate.email,
    templateName: 'report_ready_email_v1',
    subject: EMAIL_TEMPLATE_REPORT_READY.subject,
    previewBody: preview,
    status: 'would_fire',
    note: 'Email provider not yet integrated. Provider: Resend.com or SendGrid.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] sendReportReadyEmail', 'color:#EA4335;font-weight:bold');
    console.log('Recipient:', candidate.email);
    console.log('Subject:', EMAIL_TEMPLATE_REPORT_READY.subject);
    console.log('Preview:', preview);
    console.groupEnd();
  }
}

export async function sendConsultationPromptWhatsApp(candidate: CommCandidate): Promise<void> {
  const message = WA_TEMPLATE_CONSULTATION_PROMPT(candidate);
  logCommEvent({
    trigger: 'report_viewed',
    channel: 'whatsapp',
    recipient: candidate.phone || candidate.email,
    templateName: 'consultation_prompt_v1',
    previewBody: message,
    status: 'would_fire',
    note: 'Fires when report is viewed and consultation not yet booked.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] sendConsultationPromptWhatsApp', 'color:#25D366;font-weight:bold');
    console.log('Recipient:', candidate.phone);
    console.log('Template:', 'consultation_prompt_v1');
    console.log('Preview:\n', message);
    console.groupEnd();
  }
}

export async function sendConsultationPromptEmail(candidate: CommCandidate): Promise<void> {
  const preview = EMAIL_TEMPLATE_SHORTLISTING_ISSUE.preview(candidate);
  logCommEvent({
    trigger: 'report_viewed',
    channel: 'email',
    recipient: candidate.email,
    templateName: 'shortlisting_issue_email_v1',
    subject: EMAIL_TEMPLATE_SHORTLISTING_ISSUE.subject,
    previewBody: preview,
    status: 'would_fire',
    note: 'Fires when report is viewed if band is critical or needs_optimization.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] sendConsultationPromptEmail', 'color:#EA4335;font-weight:bold');
    console.log('Recipient:', candidate.email);
    console.log('Subject:', EMAIL_TEMPLATE_SHORTLISTING_ISSUE.subject);
    console.log('Preview:', preview);
    console.groupEnd();
  }
}

export async function sendBookingConfirmation(candidate: CommCandidate, bookingRef: string): Promise<void> {
  const body = `Hi ${candidate.name}, your consultation is confirmed. Booking ref: ${bookingRef}. Our team will review your diagnostic report before the call.`;
  logCommEvent({
    trigger: 'consultation_booked',
    channel: 'email',
    recipient: candidate.email,
    templateName: 'booking_confirmation_v1',
    subject: 'Your QualScore Consultation is Confirmed',
    previewBody: body,
    status: 'would_fire',
    note: 'Fires immediately after consultation booking is saved.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] sendBookingConfirmation', 'color:#EA4335;font-weight:bold');
    console.log('Recipient:', candidate.email);
    console.log('Booking Ref:', bookingRef);
    console.log('Preview:', body);
    console.groupEnd();
  }
}

export async function pushLeadToCRM(candidate: CommCandidate, meta: {
  reportId?: string | null;
  sessionId?: string | null;
  leadId?: string | null;
  bookingRef?: string | null;
} = {}): Promise<void> {
  const payload = buildCrmPayload('report_generated', candidate, meta);
  logCommEvent({
    trigger: 'report_generated',
    channel: 'crm',
    recipient: candidate.email,
    templateName: 'crm_lead_push_v1',
    previewBody: JSON.stringify(payload, null, 2),
    status: 'would_fire',
    note: 'CRM not yet integrated. Target: LeadSquared or HubSpot.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] pushLeadToCRM', 'color:#FF7A00;font-weight:bold');
    console.log('CRM Payload:', payload);
    console.groupEnd();
  }
}

export async function notifyHighPriorityLead(candidate: CommCandidate): Promise<void> {
  const body = `High priority lead identified: ${candidate.name} (${candidate.email}). Score: ${candidate.score.toFixed(1)}, Band: ${candidate.bandLabel}, Tags: ${candidate.tags.join(', ')}`;
  logCommEvent({
    trigger: 'high_priority_lead_identified',
    channel: 'internal',
    recipient: 'ops-team@qualscore.in',
    templateName: 'internal_high_priority_alert_v1',
    previewBody: body,
    status: 'would_fire',
    note: 'Internal Slack/email alert for ops team. Fires when tags include high_pain_lead or premium_lead.',
  });
  if (IS_DEV) {
    console.group('%c[CommService] notifyHighPriorityLead', 'color:#F59E0B;font-weight:bold');
    console.log('Alert recipient: ops-team@qualscore.in');
    console.log('Candidate:', candidate.name, '|', candidate.email);
    console.log('Score:', candidate.score.toFixed(1), '| Band:', candidate.bandLabel);
    console.log('Tags:', candidate.tags.join(', '));
    console.groupEnd();
  }
}

// ─── Fault-tolerant runner ────────────────────────────────────────────────────
//
// Communication and CRM events must NEVER block or crash core flows.
// allSettledSilent fires all tasks concurrently and discards failures.

async function allSettledSilent(label: string, tasks: Promise<void>[]): Promise<void> {
  const results = await Promise.allSettled(tasks);
  if (!IS_DEV) return;
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[CommService] ${label} task ${i} failed (non-blocking):`, r.reason);
    }
  });
}

// ─── Orchestrated trigger: report generated ───────────────────────────────────

export async function triggerReportGenerated(
  details: CandidateDetails,
  evaluation: FinalScore,
  report: ReportData,
  meta: { leadId?: string | null; sessionId?: string | null; reportId?: string | null }
): Promise<void> {
  const candidate = buildCommCandidate(details, evaluation, {
    paymentStatus: 'completed',
    reportViewedAt: null,
    consultationBooked: false,
  });

  const isHighPriority = evaluation.tags.includes('high_pain_lead') || evaluation.tags.includes('premium_lead');

  const tasks: Promise<void>[] = [];
  if (!opFlags.disableMessaging) {
    tasks.push(sendReportReadyWhatsApp(candidate));
    tasks.push(sendReportReadyEmail(candidate));
  }
  if (!opFlags.disableCrm) {
    tasks.push(pushLeadToCRM(candidate, { ...meta, reportId: report.sessionId }));
  }
  if (isHighPriority && !opFlags.disableMessaging) {
    tasks.push(notifyHighPriorityLead(candidate));
  }

  if (tasks.length > 0) {
    await allSettledSilent('triggerReportGenerated', tasks);
  }
}

// ─── Orchestrated trigger: report viewed ─────────────────────────────────────

export async function triggerReportViewed(
  details: CandidateDetails,
  evaluation: FinalScore
): Promise<void> {
  if (opFlags.disableMessaging) return;
  if (evaluation.tags.includes('consultation_priority') || evaluation.band !== 'strong') {
    const candidate = buildCommCandidate(details, evaluation, {
      paymentStatus: 'completed',
      reportViewedAt: new Date().toISOString(),
      consultationBooked: false,
    });
    await allSettledSilent('triggerReportViewed', [
      sendConsultationPromptWhatsApp(candidate),
      sendConsultationPromptEmail(candidate),
    ]);
  }
}

// ─── Orchestrated trigger: consultation booked ────────────────────────────────

export async function triggerConsultationBooked(
  details: CandidateDetails,
  evaluation: FinalScore,
  bookingRef: string,
  meta: { leadId?: string | null; sessionId?: string | null }
): Promise<void> {
  const candidate = buildCommCandidate(details, evaluation, {
    paymentStatus: 'completed',
    reportViewedAt: new Date().toISOString(),
    consultationBooked: true,
  });

  const tasks: Promise<void>[] = [];
  if (!opFlags.disableMessaging) {
    tasks.push(sendBookingConfirmation(candidate, bookingRef));
  }
  if (!opFlags.disableCrm) {
    tasks.push(pushLeadToCRM(candidate, { ...meta, bookingRef }));
  }

  if (tasks.length > 0) {
    await allSettledSilent('triggerConsultationBooked', tasks);
  }
}

// ─── Orchestrated trigger: high priority lead identified ─────────────────────

export async function triggerHighPriorityLead(
  details: CandidateDetails,
  evaluation: FinalScore
): Promise<void> {
  if (opFlags.disableMessaging) return;
  const candidate = buildCommCandidate(details, evaluation);
  await allSettledSilent('triggerHighPriorityLead', [notifyHighPriorityLead(candidate)]);
}
