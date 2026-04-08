import { supabase } from '../lib/supabase';
import { CandidateDetails, FinalScore } from '../types';

export interface BookingPayload {
  candidate: CandidateDetails;
  evaluation: FinalScore | null;
  leadId: string | null;
  sessionId: string | null;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

export interface BookingResult {
  bookingRef: string;
}

export class BookingError extends Error {
  constructor(
    public readonly code: 'CONFLICT' | 'DATABASE_ERROR' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'QS-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function submitConsultationBooking(payload: BookingPayload): Promise<BookingResult> {
  const bookingRef = generateBookingRef();

  const { error } = await supabase.from('consultations').insert({
    lead_id: payload.leadId ?? null,
    session_id: payload.sessionId ?? null,
    candidate_name: payload.candidate.name,
    candidate_email: payload.candidate.email,
    candidate_phone: payload.candidate.phone,
    job_role: payload.candidate.jobRole,
    preferred_date: payload.preferredDate,
    preferred_time: payload.preferredTime,
    notes: payload.notes,
    employability_score: payload.evaluation?.finalEmployabilityScore ?? 0,
    score_band: payload.evaluation?.band ?? 'needs_optimization',
    booking_ref: bookingRef,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      throw new BookingError('CONFLICT', 'A booking for this candidate already exists.');
    }
    console.error('[bookingService] Booking insert error:', error.code, error.message);
    throw new BookingError('DATABASE_ERROR', 'Could not save your booking. Please try again.');
  }

  return { bookingRef };
}

export const CONSULTATION_DURATION = '30 minutes';
export const CONSULTATION_FORMAT = 'Video call (Google Meet or Zoom)';
export const CONSULTATION_LABEL = 'QualScore Detailed Evaluation Consultation';

export function buildSlots(anchorDate?: Date): { label: string; isoDate: string; times: string[] }[] {
  const base = anchorDate ?? new Date();
  const slots = [];

  for (let i = 1; i <= 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dow = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const dom = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const label = `${dow}, ${dom}`;

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const times = isWeekend
      ? ['10:00 AM', '11:30 AM', '2:00 PM']
      : ['9:30 AM', '11:00 AM', '12:30 PM', '3:00 PM', '4:30 PM'];

    slots.push({ label, isoDate: d.toISOString().split('T')[0], times });
  }

  return slots;
}
