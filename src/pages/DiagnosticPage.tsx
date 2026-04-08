import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CheckCircle, FileText, BarChart2,
  CreditCard as Edit2, Zap, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { useFlow } from '../context/FlowContext';
import {
  diagnosticApi, mapBackendQuestions, getFallbackQuestions,
  type UiQuestion, type UiSection, type MappedQuestions,
} from '../api/services/diagnostic';
import { Analytics } from '../services/analyticsService';
import { LeadCapture } from '../services/leadCaptureService';
import { isNetworkError, isTimeoutError } from '../utils/errorUtils';
import { env } from '../config/env';
import { ROUTES } from '../constants/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalAnswer = { questionCode: string; optionCode: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const AUTOSAVE_KEY = 'qualScore_diagnostic_draft';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectionProgress(section: UiSection, answers: LocalAnswer[]): number {
  return section.questionCodes.filter((code) =>
    answers.some((a) => a.questionCode === code),
  ).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionPill({
  section,
  isCurrent,
  isComplete,
  answered,
  total,
}: {
  section: UiSection;
  isCurrent: boolean;
  isComplete: boolean;
  answered: number;
  total: number;
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
        isComplete
          ? 'bg-[#E6F4EA] text-[#34A853]'
          : isCurrent
          ? 'bg-[#E8F1FD] text-[#1A73E8]'
          : 'bg-[#F3F4F6] text-[#9CA3AF]',
      ].join(' ')}
    >
      {isComplete ? (
        <CheckCircle className="w-3 h-3 shrink-0" />
      ) : (
        <span className="font-bold">{section.letter}</span>
      )}
      <span className="hidden sm:inline">{section.sectionLabel}</span>
      {isCurrent && !isComplete && (
        <span className="text-[10px] text-[#1A73E8]/70">{answered}/{total}</span>
      )}
    </div>
  );
}

function OptionButton({
  letter,
  label,
  isSelected,
  onClick,
}: {
  letter: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all duration-150 group',
        isSelected
          ? 'border-[#1A73E8] bg-[#E8F1FD]'
          : 'border-[#E5E7EB] bg-white hover:border-[#1A73E8]/40 hover:bg-[#F8FAFE]',
      ].join(' ')}
    >
      <div className="flex items-center gap-4">
        <div
          className={[
            'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all',
            isSelected
              ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
              : 'border-[#D1D5DB] text-[#9CA3AF] group-hover:border-[#1A73E8]/60',
          ].join(' ')}
        >
          {letter}
        </div>
        <span className={isSelected ? 'text-[#1A73E8] font-semibold' : 'text-[#374151] font-medium'}>
          {label}
        </span>
      </div>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function QuestionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8 animate-pulse">
      <div className="h-3 w-24 bg-[#F3F4F6] rounded mb-5" />
      <div className="h-6 w-full bg-[#F3F4F6] rounded mb-2" />
      <div className="h-6 w-3/4 bg-[#F3F4F6] rounded mb-8" />
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-14 bg-[#F3F4F6] rounded-xl mb-3" />
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

const SUPPORT_EMAIL_DIAGNOSTIC = 'support@qualscore.in';

function FetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-[#1F2937] mb-2">Couldn't load questions</h2>
      <p className="text-[#6B7280] text-sm mb-6">
        There was a problem fetching the diagnostic questions from the server.
        Please check your connection and try again. Your payment and progress are safe.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#1A73E8] text-white font-semibold rounded-xl hover:bg-[#1557B0] transition-all mb-5"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
      <p className="text-xs text-[#9CA3AF]">
        If this keeps happening, email{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL_DIAGNOSTIC}?subject=Diagnostic+questions+not+loading`}
          className="underline hover:text-[#6B7280] transition-colors"
        >
          {SUPPORT_EMAIL_DIAGNOSTIC}
        </a>
      </p>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  questions,
  sections,
  answers,
  submitting,
  submitError,
  onEdit,
  onSubmit,
}: {
  questions: UiQuestion[];
  sections: UiSection[];
  answers: LocalAnswer[];
  submitting: boolean;
  submitError: string;
  onEdit: (index: number) => void;
  onSubmit: () => void;
}) {
  const total = questions.length;
  const answeredCount = answers.length;
  const allAnswered = answeredCount === total;
  const unansweredCount = total - answeredCount;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <div className={[
          'inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4',
          allAnswered ? 'bg-[#E6F4EA]' : 'bg-amber-50',
        ].join(' ')}>
          {allAnswered ? (
            <CheckCircle className="w-4 h-4 text-[#34A853]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          )}
          <span className={[
            'text-sm font-semibold',
            allAnswered ? 'text-[#34A853]' : 'text-amber-600',
          ].join(' ')}>
            {allAnswered
              ? `All ${total} questions answered`
              : `${unansweredCount} question${unansweredCount > 1 ? 's' : ''} still unanswered`}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-[#1F2937] mb-1">Review your answers</h2>
        <p className="text-[#6B7280] text-sm">
          {allAnswered
            ? 'Check your selections before we analyze your profile.'
            : 'Please go back and answer all questions before submitting.'}
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {sections.map((section) => (
          <div key={section.sectionCode} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FAFE] border-b border-[#E5E7EB]">
              <div className="w-7 h-7 rounded-full bg-[#1A73E8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {section.letter}
              </div>
              <span className="text-sm font-bold text-[#1F2937]">
                Section {section.letter}: {section.sectionLabel}
              </span>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {section.questionCodes.map((code) => {
                const question = questions.find((q) => q.questionCode === code);
                const answer = answers.find((a) => a.questionCode === code);
                const option = question?.options.find((o) => o.code === answer?.optionCode);
                const globalIndex = questions.findIndex((q) => q.questionCode === code);
                const optionIndex = question?.options.findIndex((o) => o.code === answer?.optionCode) ?? 0;

                return (
                  <div
                    key={code}
                    className={[
                      'px-5 py-4 flex items-start justify-between gap-4',
                      !answer ? 'bg-amber-50/60' : '',
                    ].join(' ')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#9CA3AF] mb-1">
                        Q{question?.sequence}. {question?.questionText}
                      </div>
                      {answer && option ? (
                        <div className="text-sm font-semibold text-[#1F2937] flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white bg-[#1A73E8] rounded px-1.5 py-0.5">
                            {OPTION_LETTERS[optionIndex] ?? '?'}
                          </span>
                          {option.label}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not answered — please go back and answer this question
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onEdit(globalIndex)}
                      className="shrink-0 flex items-center gap-1 text-xs font-medium text-[#1A73E8] hover:text-[#1557B0] transition-colors py-1 px-2 rounded-lg hover:bg-[#E8F1FD]"
                    >
                      <Edit2 className="w-3 h-3" />
                      {answer ? 'Edit' : 'Answer'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {submitError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <button
        onClick={allAnswered && !submitting ? onSubmit : undefined}
        disabled={!allAnswered || submitting}
        aria-busy={submitting}
        className={[
          'w-full flex items-center justify-center gap-3 px-6 py-5 font-bold text-lg rounded-xl transition-all',
          allAnswered && !submitting
            ? 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-lg hover:shadow-xl active:scale-[0.99]'
            : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed',
        ].join(' ')}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting your answers...
          </>
        ) : allAnswered ? (
          <>
            <Zap className="w-5 h-5" />
            Analyze My Profile
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 opacity-50" />
            {`Answer ${unansweredCount} more question${unansweredCount > 1 ? 's' : ''} to continue`}
          </>
        )}
      </button>
      <p className="text-center text-xs text-[#9CA3AF] mt-3">
        {allAnswered
          ? 'This will generate your personalized employability report'
          : 'Use the Edit buttons above to go back to unanswered questions'}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'loaded' | 'error';

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useFlow();

  // ── Gate: must have payment + candidate profile ──────────────────────────────
  useEffect(() => {
    if (!state.paymentCompleted || !state.paymentRef) {
      navigate(ROUTES.CHECKOUT, { replace: true });
      return;
    }
    if (!state.candidateCode || !state.candidateDetails) {
      navigate(ROUTES.DETAILS, { replace: true });
    }
  }, [state.paymentCompleted, state.paymentRef, state.candidateCode, state.candidateDetails, navigate]);

  // ── Question fetch ───────────────────────────────────────────────────────────
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isFallback, setIsFallback] = useState(false);
  const [mapped, setMapped] = useState<MappedQuestions | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoadState('loading');
    setIsFallback(false);

    const result = await diagnosticApi.getQuestions();

    if (result.ok && result.data.length > 0) {
      setMapped(mapBackendQuestions(result.data));
      setLoadState('loaded');
    } else {
      if (env.isDev) {
        console.warn('[DiagnosticPage] Backend questions unavailable — using local fallback (DEV only). This will show an error in production.');
        setMapped(getFallbackQuestions());
        setIsFallback(true);
        setLoadState('loaded');
      } else {
        setLoadState('error');
      }
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ── Analytics: diagnostic started (once) ────────────────────────────────────
  const analyticsStartedRef = useRef(false);
  useEffect(() => {
    if (loadState === 'loaded' && !analyticsStartedRef.current && state.candidateCode) {
      analyticsStartedRef.current = true;
      Analytics.diagnosticStarted(state.candidateCode);
    }
  }, [loadState, state.candidateCode]);

  // ── Local answers state ──────────────────────────────────────────────────────
  const [localAnswers, setLocalAnswers] = useState<LocalAnswer[]>(() => {
    if (state.backendAnswers.length > 0) {
      return state.backendAnswers.map((a) => ({
        questionCode: a.questionCode,
        optionCode: a.selectedOptionCode,
      }));
    }
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) return JSON.parse(saved) as LocalAnswer[];
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(localAnswers));
    } catch { /* ignore */ }
  }, [localAnswers]);

  // ── Navigation state ─────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const answered = localAnswers.length;
    return answered > 0 && mapped ? Math.min(answered, (mapped.total || 1) - 1) : 0;
  });
  const [showReview, setShowReview] = useState(false);
  const [animDir, setAnimDir] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  // ── Submission state ─────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  if (!state.paymentCompleted || !state.paymentRef || !state.candidateCode) {
    return (
      <div className="min-h-screen bg-[#F2F6FB] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#1A73E8]/30 border-t-[#1A73E8] rounded-full animate-spin" />
      </div>
    );
  }
  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-[#F2F6FB]">
        <PageHeader answeredCount={0} total={0} showReview={false} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <QuestionSkeleton />
        </main>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-[#F2F6FB]">
        <PageHeader answeredCount={0} total={0} showReview={false} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <FetchError onRetry={fetchQuestions} />
        </main>
      </div>
    );
  }

  if (!mapped) {
    return (
      <div className="min-h-screen bg-[#F2F6FB]">
        <PageHeader answeredCount={0} total={0} showReview={false} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <QuestionSkeleton />
        </main>
      </div>
    );
  }

  const { questions, sections, total } = mapped;

  const question = questions[currentIndex];
  const currentAnswer = localAnswers.find((a) => a.questionCode === question?.questionCode);
  const activeOptionCode = currentAnswer?.optionCode ?? '';

  const answeredCount = localAnswers.length;
  const progressPercent = (answeredCount / total) * 100;

  const currentSection = sections.find((s) =>
    s.questionCodes.includes(question?.questionCode ?? ''),
  );
  const currentSectionIndex = sections.findIndex((s) => s.sectionCode === currentSection?.sectionCode);

  function selectOption(optionCode: string) {
    if (!question) return;
    setLocalAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionCode !== question.questionCode);
      return [...filtered, { questionCode: question.questionCode, optionCode }];
    });
  }

  function animateTo(nextIndex: number, dir: 'next' | 'prev') {
    setAnimDir(dir);
    setAnimating(true);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setCurrentIndex(nextIndex);
      setAnimating(false);
    }, 180);
  }

  function handleNext() {
    if (!activeOptionCode) return;
    if (currentIndex < total - 1) {
      animateTo(currentIndex + 1, 'next');
    } else {
      setShowReview(true);
    }
  }

  function handlePrev() {
    if (showReview) { setShowReview(false); return; }
    if (currentIndex === 0) return;
    animateTo(currentIndex - 1, 'prev');
  }

  function handleEdit(index: number) {
    setShowReview(false);
    setCurrentIndex(index);
  }

  async function handleSubmit() {
    if (localAnswers.length < total || submittingRef.current) return;

    const candidateCode = state.candidateCode;
    if (!candidateCode) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    const backendAnswers = localAnswers.map((a) => ({
      questionCode: a.questionCode,
      selectedOptionCode: a.optionCode,
    }));

    const result = await diagnosticApi.submitAnswers({ candidateCode, answers: backendAnswers });

    setSubmitting(false);
    submittingRef.current = false;

    if (!result.ok) {
      if (isNetworkError(result.error)) {
        setSubmitError('No internet connection. Please check your network and try again. Your answers are saved.');
      } else if (isTimeoutError(result.error)) {
        setSubmitError('The server took too long to respond. Your answers are saved — please try submitting again.');
      } else if (result.error.code === 'VALIDATION_ERROR') {
        setSubmitError('Some answers could not be processed. Please review your responses and try again.');
      } else {
        setSubmitError('Submission failed. Please try again. Your answers are saved locally.');
      }
      return;
    }

    Analytics.diagnosticCompleted(candidateCode);
    LeadCapture.onDiagnosticDone(candidateCode);

    dispatch({ type: 'SET_DIAGNOSTIC_SUBMITTED', payload: backendAnswers });
    dispatch({ type: 'SET_STEP', payload: 'analysis' });
    localStorage.removeItem(AUTOSAVE_KEY);

    navigate(ROUTES.ANALYSIS);
  }

  const isLastQuestion = currentIndex === total - 1;
  const canGoNext = !!activeOptionCode;

  return (
    <div className="min-h-screen bg-[#F2F6FB]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#1F2937] text-sm">QualScore</span>
            </div>
            <div className="flex items-center gap-2">
              {isFallback && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  DEV FALLBACK
                </span>
              )}
              <span className="text-xs font-semibold text-[#1A73E8] bg-[#E8F1FD] px-2.5 py-1 rounded-full">
                {showReview ? 'Review' : `${answeredCount} / ${total} answered`}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#1A73E8] rounded-full transition-all duration-500 ease-out"
              style={{ width: showReview ? '100%' : `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {sections.map((section, si) => {
              const answeredInSection = getSectionProgress(section, localAnswers);
              const isComplete = answeredInSection === section.questionCodes.length;
              const isCurrent = !showReview && si === currentSectionIndex;
              return (
                <SectionPill
                  key={section.sectionCode}
                  section={section}
                  isCurrent={isCurrent}
                  isComplete={isComplete}
                  answered={answeredInSection}
                  total={section.questionCodes.length}
                />
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {showReview ? (
          <ReviewScreen
            questions={questions}
            sections={sections}
            answers={localAnswers}
            submitting={submitting}
            submitError={submitError}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
          />
        ) : (
          <div className="max-w-2xl mx-auto">
            {currentSection && (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2.5 bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-2.5 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#1A73E8] text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {currentSection.letter}
                  </div>
                  <div>
                    <div className="text-xs text-[#9CA3AF] font-medium">
                      Section {currentSection.letter} of {sections.length}
                    </div>
                    <div className="text-sm font-bold text-[#1F2937]">{currentSection.sectionLabel}</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-2.5 text-center shrink-0">
                  <div className="text-lg font-bold text-[#1F2937]">{currentIndex + 1}</div>
                  <div className="text-[10px] text-[#9CA3AF]">of {total}</div>
                </div>
              </div>
            )}

            <div
              className={[
                'bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8 transition-all duration-180',
                animating
                  ? animDir === 'next'
                    ? 'opacity-0 translate-x-4'
                    : 'opacity-0 -translate-x-4'
                  : 'opacity-100 translate-x-0',
              ].join(' ')}
              style={{
                transform: animating
                  ? (animDir === 'next' ? 'translateX(12px)' : 'translateX(-12px)')
                  : 'translateX(0)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
                  Question {currentIndex + 1}
                </span>
                {currentAnswer && (
                  <span className="text-xs text-[#34A853] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Answered
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[#1F2937] mb-7 leading-snug">
                {question?.questionText}
              </h2>

              <div className="flex flex-col gap-3 mb-8">
                {question?.options.map((option, oi) => (
                  <OptionButton
                    key={option.code}
                    letter={OPTION_LETTERS[oi] ?? String(oi + 1)}
                    label={option.label}
                    isSelected={activeOptionCode === option.code}
                    onClick={() => selectOption(option.code)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={[
                    'flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all',
                    currentIndex === 0
                      ? 'text-[#D1D5DB] cursor-not-allowed'
                      : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]',
                  ].join(' ')}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className={[
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all',
                    canGoNext
                      ? isLastQuestion
                        ? 'bg-[#34A853] hover:bg-[#2E9648] text-white shadow-md hover:shadow-lg'
                        : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-md hover:shadow-lg'
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed',
                  ].join(' ')}
                >
                  {isLastQuestion ? (
                    <>
                      <BarChart2 className="w-4 h-4" />
                      Review Answers
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 mt-6">
              {questions.map((q, i) => {
                const isAnswered = localAnswers.some((a) => a.questionCode === q.questionCode);
                const isCur = i === currentIndex;
                return (
                  <button
                    key={q.questionCode}
                    type="button"
                    onClick={() => {
                      if (isAnswered || i === currentIndex + 1 || i <= currentIndex) {
                        animateTo(i, i > currentIndex ? 'next' : 'prev');
                      }
                    }}
                    title={`Question ${i + 1}`}
                    className={[
                      'rounded-full transition-all duration-200',
                      isCur
                        ? 'w-6 h-2.5 bg-[#1A73E8]'
                        : isAnswered
                        ? 'w-2.5 h-2.5 bg-[#34A853] hover:bg-[#2E9648]'
                        : 'w-2.5 h-2.5 bg-[#D1D5DB]',
                    ].join(' ')}
                  />
                );
              })}
            </div>

            {!activeOptionCode && (
              <p className="text-center text-xs text-[#9CA3AF] mt-4">
                Select an answer to continue
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PageHeader({
  answeredCount,
  total,
  showReview,
}: {
  answeredCount: number;
  total: number;
  showReview: boolean;
}) {
  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#1F2937] text-sm">QualScore</span>
          </div>
          <span className="text-xs font-semibold text-[#1A73E8] bg-[#E8F1FD] px-2.5 py-1 rounded-full">
            {showReview ? 'Review' : `${answeredCount} / ${total} answered`}
          </span>
        </div>
        <div className="h-2 bg-[#E5E7EB] rounded-full" />
      </div>
    </header>
  );
}
