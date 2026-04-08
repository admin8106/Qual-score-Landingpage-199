import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, CheckCircle,
  ArrowLeft, ChevronRight, User, MessageSquare, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useFlow } from '../context/FlowContext';
import { ROUTES } from '../constants/routes';
import { consultationsApi, type BookConsultationResponse, type ConsultationSummary } from '../api/services/consultations';
import { Mail, Phone } from 'lucide-react';
import { Analytics } from '../services/analyticsService';
import { isNetworkError, isTimeoutError } from '../utils/errorUtils';
import { getBandConfig } from '../utils/reportInsights';
import { buildSlots, CONSULTATION_DURATION, CONSULTATION_FORMAT } from '../services/bookingService';

// ─── Static content ───────────────────────────────────────────────────────────

const WHY_BULLETS = [
  'Understand your strengths and gaps in depth',
  'Get clarity on what is affecting your shortlisting rate',
  'Know exactly what to improve next, and in what order',
  'Move toward a recruiter-ready profile with a clear plan',
];

const WHAT_NEXT = [
  {
    step: '1',
    title: 'Book your consultation',
    desc: 'Choose a slot that works for you. Our team is notified immediately.',
  },
  {
    step: '2',
    title: 'We review your diagnostic outcome',
    desc: 'Our evaluator reviews your report, score band, and flagged gaps before the call.',
  },
  {
    step: '3',
    title: 'Your QualScore evaluation path',
    desc: 'We walk you through the detailed QualScore evaluation and what it means for your career.',
  },
];

const TESTIMONIAL = {
  quote: 'The consultation gave me a clear picture of exactly what was holding me back. Within three weeks of implementing the plan, I had two interview calls.',
  name: 'Priya S.',
  role: 'Marketing Manager, Bengaluru',
};

// ─── Existing booking banner ──────────────────────────────────────────────────

function ExistingBookingBanner({
  booking,
  onViewReport,
}: {
  booking: ConsultationSummary;
  onViewReport: () => void;
}) {
  const statusLabel = booking.bookingStatus === 'CONFIRMED' ? 'Confirmed' : 'Requested';
  const statusColor = booking.bookingStatus === 'CONFIRMED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-emerald-300">You already have a consultation booked</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="text-xs text-slate-400">
            {booking.preferredDate} at {booking.preferredTime}
            {booking.bookingId && (
              <> &middot; Ref: <span className="font-mono text-slate-300">{booking.bookingId.slice(0, 8).toUpperCase()}</span></>
            )}
          </p>
        </div>
        <button
          onClick={onViewReport}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
        >
          Back to report
        </button>
      </div>
    </div>
  );
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
  booking,
  email,
  phone,
  onBack,
}: {
  booking: BookConsultationResponse;
  email: string;
  phone?: string;
  onBack: () => void;
}) {
  const bookingRef = booking.bookingId
    ? booking.bookingId.slice(0, 8).toUpperCase()
    : '—';

  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Consultation Booked</h1>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            Your slot is confirmed. Our team will review your diagnostic report before the call.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Booking Reference</span>
            <span className="font-mono text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-lg">
              {bookingRef}
            </span>
          </div>

          <div className="space-y-4">
            {[
              { Icon: Calendar, label: 'Date',   value: booking.preferredDate },
              { Icon: Clock,    label: 'Time',   value: `${booking.preferredTime} IST · ${CONSULTATION_DURATION}` },
              { Icon: Video,    label: 'Format', value: CONSULTATION_FORMAT },
              { Icon: User,     label: 'With',   value: 'QualScore Evaluator' },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm text-slate-200">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comms confirmation — subtle, non-blocking */}
        <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            {phone && <Phone className="w-3.5 h-3.5 text-slate-500" />}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Confirmation sent to <span className="text-slate-400">{email}</span>
            {phone && (
              <> and your registered number</>
            )}
            . Check your inbox for the call link closer to your slot.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">What to expect on the call</p>
          <ul className="space-y-2">
            {[
              'A review of your Employability Diagnostic Report',
              'Identification of your 3 highest-impact improvement areas',
              'An overview of the detailed QualScore evaluation path',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl py-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Report
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar diagnostic summary ───────────────────────────────────────────────

function DiagnosticSummaryCard() {
  const { state } = useFlow();
  const evaluation  = state.evaluation;
  const candidate   = state.candidateDetails;

  if (!evaluation || !candidate) return null;

  const band   = evaluation.band ?? 'needs_optimization';
  const score  = evaluation.finalEmployabilityScore ?? 0;
  const config = getBandConfig(band, score);

  const bandDisplay: Record<string, string> = {
    critical: 'Not Competitive',
    needs_optimization: 'Needs Optimization',
    strong: 'Strong',
  };

  const bandMessage: Record<string, string> = {
    critical: 'Your score indicates significant gaps. This consultation will prioritise the fastest route to improvement.',
    needs_optimization: 'You have real potential. This consultation will pinpoint the specific changes that unlock shortlisting.',
    strong: 'Your profile is strong. This consultation will help you convert that into top-tier shortlisting outcomes.',
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Your Diagnostic Summary</p>

      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/[0.06]">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center border-2 shrink-0"
          style={{ borderColor: config.ringColor }}
        >
          <span className="text-xl font-bold text-white">{score.toFixed(1)}</span>
        </div>
        <div>
          <p className="text-white font-semibold leading-tight">{candidate.name}</p>
          <p className="text-xs text-slate-400">{candidate.jobRole}</p>
          <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}>
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: config.ringColor }} />
            {bandDisplay[band] ?? band}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        {bandMessage[band] ?? bandMessage.needs_optimization}
      </p>
    </div>
  );
}

// ─── Error display ────────────────────────────────────────────────────────────

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PagePhase = 'prefetching' | 'form' | 'submitting' | 'confirmed';

export default function BookingPage() {
  const navigate    = useNavigate();
  const { state, setBooking } = useFlow();

  const slots = useMemo(() => buildSlots(), []);
  const [phase, setPhase]               = useState<PagePhase>('prefetching');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes]               = useState('');
  const [submitError, setSubmitError]   = useState('');
  const [timeError, setTimeError]       = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookConsultationResponse | null>(null);
  const [existingBooking, setExistingBooking]   = useState<ConsultationSummary | null>(null);

  const submittingRef = useRef(false);
  const mountedRef    = useRef(true);
  const NOTES_MAX     = 400;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const candidate    = state.candidateDetails;
  const candidateCode = state.candidateCode ?? '';
  const selectedDay  = slots[selectedDayIdx];

  // ── Guard: no candidate reference ──────────────────────────────────────────
  useEffect(() => {
    if (!candidateCode) {
      navigate(ROUTES.LANDING, { replace: true });
    }
  }, [candidateCode, navigate]);

  // ── Analytics: page view (consultation intent) ─────────────────────────────
  useEffect(() => {
    if (candidateCode) {
      Analytics.consultationCtaClicked('booking_page_view', candidateCode);
    }
  }, [candidateCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Prefetch: check for existing booking ───────────────────────────────────
  useEffect(() => {
    if (!candidateCode) return;

    if (state.consultationBooked && state.bookingDetails) {
      setPhase('form');
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await consultationsApi.listForCandidate(candidateCode);
      if (cancelled) return;

      if (result.ok && Array.isArray(result.data?.bookings) && result.data.bookings.length > 0) {
        setExistingBooking(result.data.bookings[0]);
      }
      setPhase('form');
    })();

    return () => { cancelled = true; };
  }, [candidateCode, state.consultationBooked, state.bookingDetails]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedTime) {
      setTimeError('Please select a time slot to continue.');
      return;
    }
    if (!candidate || !candidateCode) {
      setSubmitError('Session data is missing. Please go back and reload the page.');
      return;
    }
    if (submittingRef.current) return;

    setTimeError('');
    setSubmitError('');
    submittingRef.current = true;
    setPhase('submitting');

    const result = await consultationsApi.book({
      candidateReference: candidateCode,
      preferredDate:      selectedDay.isoDate,
      preferredTime:      selectedTime,
      notes:              notes.trim() || undefined,
    });

    submittingRef.current = false;

    if (!mountedRef.current) return;

    if (!result.ok) {
      setPhase('form');
      if (result.error.code === 'CONFLICT') {
        setSubmitError('It looks like you already have a booking. Please contact us if you need to reschedule.');
      } else if (result.error.code === 'VALIDATION_ERROR') {
        setSubmitError('Please check the selected date and time and try again.');
      } else if (isNetworkError(result.error)) {
        setSubmitError('No internet connection. Please check your network and try again.');
      } else if (isTimeoutError(result.error)) {
        setSubmitError('The server took too long to respond. Please try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      return;
    }

    const booked = result.data;

    const bookingRef = booked.bookingId ?? '';

    setBooking({
      date:       booked.preferredDate,
      time:       booked.preferredTime,
      notes,
      bookedAt:   new Date().toISOString(),
      bookingRef,
    });

    setConfirmedBooking(booked);
    setPhase('confirmed');

    Analytics.consultationBooked(bookingRef, candidateCode);
  }, [selectedTime, candidate, candidateCode, selectedDay, notes, setBooking]);

  // ── Confirmed screen ───────────────────────────────────────────────────────
  if (phase === 'confirmed' && confirmedBooking) {
    return (
      <ConfirmationScreen
        booking={confirmedBooking}
        email={candidate?.email ?? ''}
        phone={candidate?.phone}
        onBack={() => navigate(ROUTES.REPORT)}
      />
    );
  }

  const isSubmitting = phase === 'submitting';
  const isPrefetching = phase === 'prefetching';

  return (
    <div className="min-h-screen bg-[#080C18]">
      {/* ── Header bar ── */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">QualScore</span>
            <span className="hidden sm:inline text-xs text-slate-500">Consultation Booking</span>
          </div>
          <button
            onClick={() => navigate(ROUTES.REPORT)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Report
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── Hero ── */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Next Step</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Book Your Detailed QualScore{' '}
            <span className="hidden sm:inline"><br /></span>
            Evaluation Consultation
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Your diagnostic report shows where the gaps may be. The next step is to understand how to fix them properly.
          </p>
        </div>

        {/* ── Existing booking banner ── */}
        {!isPrefetching && existingBooking && (
          <ExistingBookingBanner
            booking={existingBooking}
            onViewReport={() => navigate(ROUTES.REPORT)}
          />
        )}

        {/* ── Prefetch loading skeleton ── */}
        {isPrefetching && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking your bookings...</span>
            </div>
          </div>
        )}

        {!isPrefetching && (
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ── Left: content + form ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Why this matters */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-7">
                <h2 className="text-base font-semibold text-white mb-5">Why this consultation matters</h2>
                <ul className="space-y-3">
                  {WHY_BULLETS.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-sm text-slate-300 leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What happens next */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-7">
                <h2 className="text-base font-semibold text-white mb-6">What happens next</h2>
                <div className="space-y-0">
                  {WHAT_NEXT.map((item, i) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#1A73E8]/15 border border-[#1A73E8]/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-400">{item.step}</span>
                        </div>
                        {i < WHAT_NEXT.length - 1 && (
                          <div className="w-px h-8 bg-white/[0.06] my-1" />
                        )}
                      </div>
                      <div className={`pb-6 ${i === WHAT_NEXT.length - 1 ? 'pb-0' : ''}`}>
                        <p className="text-sm font-semibold text-slate-200 mb-1 mt-1">{item.title}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking form */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-7">
                <h2 className="text-base font-semibold text-white mb-6">Choose your preferred slot</h2>

                {/* Day selector */}
                <div className="mb-6">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Preferred date</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {slots.map((s, i) => (
                      <button
                        key={s.isoDate}
                        onClick={() => { setSelectedDayIdx(i); setSelectedTime(''); }}
                        disabled={isSubmitting}
                        className={[
                          'shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150',
                          selectedDayIdx === i
                            ? 'bg-[#1A73E8] border-[#1A73E8] text-white shadow-lg shadow-blue-900/30'
                            : 'bg-white/[0.03] border-white/[0.10] text-slate-400 hover:border-white/20 hover:text-slate-200',
                          isSubmitting ? 'opacity-50 pointer-events-none' : '',
                        ].join(' ')}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div className="mb-6">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Preferred time (IST)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDay.times.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTime(t); setTimeError(''); }}
                        disabled={isSubmitting}
                        className={[
                          'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150',
                          selectedTime === t
                            ? 'bg-[#1A73E8] border-[#1A73E8] text-white shadow-lg shadow-blue-900/30'
                            : 'bg-white/[0.03] border-white/[0.10] text-slate-400 hover:border-white/20 hover:text-slate-200',
                          isSubmitting ? 'opacity-50 pointer-events-none' : '',
                        ].join(' ')}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Notes for our team (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
                    disabled={isSubmitting}
                    placeholder="Any specific concerns, questions, or context you'd like us to know before the call..."
                    rows={3}
                    maxLength={NOTES_MAX}
                    className="w-full bg-white/[0.03] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none leading-relaxed disabled:opacity-50"
                  />
                  <p className="text-right text-xs text-slate-700 mt-1">{notes.length}/{NOTES_MAX}</p>
                </div>

                {/* Errors */}
                {timeError && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-300">{timeError}</p>
                  </div>
                )}
                {submitError && <InlineError message={submitError} />}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={[
                    'w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold text-sm transition-all duration-200',
                    !isSubmitting
                      ? 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 active:scale-[0.99]'
                      : 'bg-[#1A73E8]/60 text-white cursor-not-allowed',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirming your booking...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Confirm Consultation Booking
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-600 mt-3">
                  All times in IST · Confirmation will be sent to {candidate?.email ?? 'your email'}
                </p>
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="space-y-5">

              <DiagnosticSummaryCard />

              {/* Session details */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Session details</p>
                <div className="space-y-3.5">
                  {[
                    { Icon: Clock,    label: 'Duration', value: CONSULTATION_DURATION },
                    { Icon: Video,    label: 'Format',   value: 'Video call' },
                    { Icon: User,     label: 'With',     value: 'QualScore Evaluator' },
                    { Icon: Calendar, label: 'Call link', value: 'Sent to email before call' },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/8 border border-blue-500/12 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{label}</p>
                        <p className="text-xs text-slate-300">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic mb-3">
                  "{TESTIMONIAL.quote}"
                </p>
                <p className="text-xs font-semibold text-slate-300">{TESTIMONIAL.name}</p>
                <p className="text-xs text-slate-600">{TESTIMONIAL.role}</p>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed px-1">
                This consultation is part of the QualScore evaluation process and does not guarantee employment outcomes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
