import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Linkedin, ArrowRight, ShieldCheck, FileText,
  ClipboardList, User, Phone, Mail, MapPin, Briefcase, Clock,
  AlertCircle, ChevronDown, ChevronUp, Sparkles, Star, Info, HelpCircle,
} from 'lucide-react';
import { useFlow } from '../context/FlowContext';
import { candidatesApi, toBackendCareerStage } from '../api/services/candidates';
import { Analytics } from '../services/analyticsService';
import { isNetworkError, isTimeoutError } from '../utils/errorUtils';
import {
  validateLinkedInProfileUrl,
  LINKEDIN_VALIDATION_MESSAGE,
  LinkedInRejectionReason,
} from '../utils/linkedinValidator';
import { CandidateDetails, CareerStage } from '../types';
import { ROUTES } from '../constants/routes';
import { LeadCapture } from '../services/leadCaptureService';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  'Technology / IT',
  'Banking & Finance',
  'Consulting',
  'Healthcare & Pharma',
  'E-commerce / Retail',
  'Marketing & Advertising',
  'Manufacturing & Operations',
  'Education & EdTech',
  'Media & Entertainment',
  'Real Estate',
  'Startups / Entrepreneurship',
  'Government / Public Sector',
  'Other',
];

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Select experience' },
  { value: '0', label: 'Fresher (0 years)' },
  { value: '1', label: '1 year' },
  { value: '2', label: '2 years' },
  { value: '3', label: '3 years' },
  { value: '4', label: '4 years' },
  { value: '5', label: '5 years' },
  { value: '6-8', label: '6–8 years' },
  { value: '9-12', label: '9–12 years' },
  { value: '13+', label: '13+ years' },
];

const AUTOSAVE_KEY = 'qualScore_candidate_draft';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof CandidateDetails, string>>;

const EMPTY_FORM: CandidateDetails = {
  name: '',
  email: '',
  phone: '',
  location: '',
  jobRole: '',
  yearsExperience: '',
  careerStage: '',
  industry: '',
  linkedinUrl: '',
  linkedinHeadline: '',
  linkedinAboutText: '',
  linkedinExperienceText: '',
  linkedinAchievements: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
      <p className="text-xs text-red-500">{message}</p>
    </div>
  );
}

function InputBase({
  hasError,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
      )}
      <input
        {...props}
        className={[
          'w-full rounded-xl border px-4 py-3 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none transition-all',
          'focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]',
          Icon ? 'pl-10' : '',
          hasError
            ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
            : 'border-[#E5E7EB] bg-white hover:border-[#1A73E8]/40',
          props.className || '',
        ].join(' ')}
      />
    </div>
  );
}

function SelectBase({
  hasError,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <select
      {...props}
      className={[
        'w-full rounded-xl border px-4 py-3 text-sm text-[#1F2937] outline-none appearance-none transition-all bg-white',
        'focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]',
        hasError
          ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
          : 'border-[#E5E7EB] hover:border-[#1A73E8]/40',
        props.className || '',
      ].join(' ')}
    >
      {children}
    </select>
  );
}

function TextareaBase({
  hasError,
  maxLength,
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
  maxLength?: number;
  value?: string;
}) {
  const count = typeof value === 'string' ? value.length : 0;
  const near  = maxLength ? count >= maxLength * 0.85 : false;
  return (
    <div className="relative">
      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        className={[
          'w-full rounded-xl border px-4 py-3 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none transition-all resize-none leading-relaxed',
          'focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]',
          hasError
            ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
            : 'border-[#E5E7EB] bg-white hover:border-[#1A73E8]/40',
          props.className || '',
        ].join(' ')}
      />
      {maxLength && (
        <div className={['absolute bottom-2 right-3 text-[10px] tabular-nums', near ? 'text-amber-500' : 'text-[#D1D5DB]'].join(' ')}>
          {count}/{maxLength}
        </div>
      )}
    </div>
  );
}

function SidePanel({ candidateCode }: { candidateCode: string | null }) {
  const STEPS = [
    { icon: CheckCircle, label: 'Payment confirmed', done: true },
    { icon: FileText, label: 'Report unlocked', done: true },
    { icon: ClipboardList, label: 'Answer diagnostic questions', done: false, current: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#E6F4EA] rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-[#34A853]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#1F2937]">Payment Successful</div>
            <div className="text-xs text-[#6B7280]">Your report is unlocked</div>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map(({ icon: Icon, label, done, current }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  done
                    ? 'bg-[#34A853]'
                    : current
                    ? 'bg-[#1A73E8]'
                    : 'bg-[#E5E7EB]',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span
                className={[
                  'text-sm',
                  done ? 'text-[#34A853] font-medium' : current ? 'text-[#1A73E8] font-semibold' : 'text-[#9CA3AF]',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {candidateCode && (
          <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
            <div className="text-xs text-[#9CA3AF] mb-0.5">Your reference</div>
            <div className="text-xs font-mono font-semibold text-[#1F2937] tracking-wide">{candidateCode}</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#34A853]" />
          <span className="text-sm font-semibold text-[#1F2937]">100% Confidential</span>
        </div>
        <p className="text-xs text-[#6B7280] leading-relaxed">
          Your data is used only to personalize your report. We never share, sell, or log into your LinkedIn account.
        </p>
      </div>

      <div className="bg-[#E8F1FD] rounded-2xl p-5">
        <div className="text-xs font-semibold text-[#1A73E8] uppercase tracking-wide mb-2">What's next</div>
        <div className="space-y-2">
          {[
            '15 diagnostic questions (5 min)',
            'AI-powered analysis',
            'Your personalized report',
          ].map((item, i) => (
            <div key={item} className="flex items-center gap-2 text-xs text-[#1F2937]">
              <div className="w-5 h-5 rounded-full bg-[#1A73E8] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateFormPage() {
  const navigate = useNavigate();
  const { setCandidateDetails, setCandidateCode, setLinkedinUrlError, dispatch, state } = useFlow();
  const formRef = useRef<HTMLFormElement>(null);

  // ── Payment gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.paymentCompleted || !state.paymentRef) {
      navigate(ROUTES.CHECKOUT, { replace: true });
    }
  }, [state.paymentCompleted, state.paymentRef, navigate]);

  // ── Restore LinkedIn URL error signalled from a later step (e.g. AnalysisPage) ─
  useEffect(() => {
    if (state.linkedinUrlError) {
      setErrors((prev) => ({ ...prev, linkedinUrl: state.linkedinUrlError! }));
      setLinkedInTouched(true);
      setLinkedInReason('invalid');
      setLinkedinUrlError(null);
      setTimeout(() => {
        const el = formRef.current?.querySelector<HTMLElement>('[data-error="true"]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, []); // run once on mount — state is hydrated from localStorage before first render

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CandidateDetails>(() => {
    if (state.candidateDetails) return state.candidateDetails;
    try {
      const draft = localStorage.getItem(AUTOSAVE_KEY);
      if (draft) return JSON.parse(draft) as CandidateDetails;
    } catch {
      // ignore corrupt draft
    }
    return EMPTY_FORM;
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);
  const [linkedInTouched, setLinkedInTouched] = useState(false);
  const [linkedInReason, setLinkedInReason] = useState<LinkedInRejectionReason | null>(null);
  const [linkedinHelpOpen, setLinkedinHelpOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(() => {
    const draft = form;
    return !!(draft.linkedinHeadline || draft.linkedinAboutText || draft.linkedinExperienceText || draft.linkedinAchievements);
  });
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, []);

  const requiredFields: (keyof CandidateDetails)[] = [
    'name', 'email', 'phone', 'location', 'jobRole',
    'yearsExperience', 'careerStage', 'industry', 'linkedinUrl',
  ];
  const completedCount = requiredFields.filter((f) => !!form[f]).length;
  const completionPct  = Math.round((completedCount / requiredFields.length) * 100);

  // ── Draft autosave ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
    } catch {
      // ignore storage errors
    }
  }, [form]);

  function set(field: keyof CandidateDetails) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function handleLinkedInChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSaved(false);
    setForm((prev) => ({ ...prev, linkedinUrl: val }));
    if (!val.trim()) {
      setLinkedInReason(null);
      setErrors((prev) => ({ ...prev, linkedinUrl: undefined }));
      return;
    }
    const result = validateLinkedInProfileUrl(val);
    if (!result.valid) {
      setLinkedInReason(result.reason);
      if (linkedInTouched) {
        setErrors((prev) => ({ ...prev, linkedinUrl: LINKEDIN_VALIDATION_MESSAGE }));
      }
    } else {
      setLinkedInReason(null);
      setErrors((prev) => ({ ...prev, linkedinUrl: undefined }));
    }
  }

  function handleLinkedInBlur() {
    setLinkedInTouched(true);
    const val = form.linkedinUrl.trim();
    if (!val) {
      setLinkedInReason('empty');
      setErrors((prev) => ({ ...prev, linkedinUrl: 'LinkedIn profile URL is required' }));
      return;
    }
    const result = validateLinkedInProfileUrl(val);
    if (!result.valid) {
      setLinkedInReason(result.reason);
      setErrors((prev) => ({ ...prev, linkedinUrl: LINKEDIN_VALIDATION_MESSAGE }));
    } else {
      setLinkedInReason(null);
      setForm((prev) => ({ ...prev, linkedinUrl: result.normalizedUrl }));
      setErrors((prev) => ({ ...prev, linkedinUrl: undefined }));
    }
  }

  function handleEmailBlur() {
    if (form.email && form.email.includes('@')) {
      LeadCapture.onEmailEntered(form.email.trim(), form.name.trim() || undefined);
    }
  }

  function handlePhoneBlur() {
    if (form.phone && form.phone.length >= 10) {
      LeadCapture.onProfileFilled(
        state.candidateCode ?? '',
        form.email.trim() || undefined,
        form.name.trim() || undefined,
        form.phone.trim(),
      );
    }
  }

  function setCareerStage(stage: CareerStage) {
    setSaved(false);
    setForm((prev) => ({ ...prev, careerStage: stage }));
    setErrors((prev) => ({ ...prev, careerStage: undefined }));
  }

  function setTextarea(field: keyof CandidateDetails) {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  const enrichedFieldCount = [
    form.linkedinHeadline,
    form.linkedinAboutText,
    form.linkedinExperienceText,
    form.linkedinAchievements,
  ].filter(Boolean).length;

  // ── Frontend validation ─────────────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {};

    if (!form.name.trim()) e.name = 'Full name is required';

    if (!form.email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Please enter a valid email address';
    }

    if (!form.phone.trim()) {
      e.phone = 'Mobile number is required';
    } else if (!/^\+?[\d\s\-()]{10,15}$/.test(form.phone.trim())) {
      e.phone = 'Enter a valid 10-digit mobile number';
    }

    if (!form.location.trim()) e.location = 'City / location is required';

    if (!form.jobRole.trim()) e.jobRole = 'Current role is required';

    if (!form.yearsExperience) e.yearsExperience = 'Please select your experience';

    if (!form.careerStage) e.careerStage = 'Please select your career stage';

    if (!form.industry) e.industry = 'Please select your industry';

    if (!form.linkedinUrl.trim()) {
      e.linkedinUrl = 'LinkedIn profile URL is required';
    } else {
      const liResult = validateLinkedInProfileUrl(form.linkedinUrl);
      if (!liResult.valid) {
        e.linkedinUrl = LINKEDIN_VALIDATION_MESSAGE;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Apply backend field-level errors to form errors state ───────────────────
  function applyBackendErrors(details: { field: string; message: string }[]) {
    const FIELD_MAP: Record<string, keyof CandidateDetails> = {
      fullName:          'name',
      email:             'email',
      mobileNumber:      'phone',
      location:          'location',
      currentRole:       'jobRole',
      totalExperienceYears: 'yearsExperience',
      careerStage:       'careerStage',
      industry:          'industry',
      linkedinUrl:       'linkedinUrl',
    };

    const mapped: FormErrors = {};
    for (const { field, message } of details) {
      const frontendField = FIELD_MAP[field];
      if (frontendField) mapped[frontendField] = message;
    }

    if (Object.keys(mapped).length > 0) {
      setErrors((prev) => ({ ...prev, ...mapped }));
    }
  }

  // ── Submit handler ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    setSubmitError('');
    setSaved(false);

    if (!validate()) {
      const firstError = formRef.current?.querySelector<HTMLElement>('[data-error="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!state.paymentRef) {
      navigate(ROUTES.CHECKOUT, { replace: true });
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    const result = await candidatesApi.createProfile({
      paymentReference:      state.paymentRef,
      fullName:              form.name.trim(),
      email:                 form.email.trim(),
      mobileNumber:          form.phone.trim() || undefined,
      currentRole:           form.jobRole.trim() || undefined,
      careerStage:           toBackendCareerStage(form.careerStage as CareerStage),
      industry:              form.industry || undefined,
      location:              form.location.trim() || undefined,
      linkedinUrl:           form.linkedinUrl.trim() || undefined,
      totalExperienceYears:  form.yearsExperience || undefined,
      linkedinHeadline:      form.linkedinHeadline?.trim() || undefined,
      linkedinAboutText:     form.linkedinAboutText?.trim() || undefined,
      linkedinExperienceText: form.linkedinExperienceText?.trim() || undefined,
      linkedinAchievements:  form.linkedinAchievements?.trim() || undefined,
    });

    setLoading(false);
    submittingRef.current = false;

    if (!result.ok) {
      if (result.error.code === 'INVALID_LINKEDIN_URL') {
        setErrors((prev) => ({
          ...prev,
          linkedinUrl: result.error.message || 'Your LinkedIn profile URL appears invalid. Please correct it to continue.',
        }));
        setLinkedInTouched(true);
        setLinkedInReason('invalid');
        const linkedInField = formRef.current?.querySelector<HTMLElement>('[data-error="true"]');
        linkedInField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (result.error.code === 'VALIDATION_ERROR' && result.error.details?.length) {
        applyBackendErrors(result.error.details);
        setSubmitError('Please fix the highlighted fields and try again.');
        const firstError = formRef.current?.querySelector<HTMLElement>('[data-error="true"]');
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (isNetworkError(result.error)) {
        setSubmitError('No internet connection. Please check your network and try again. Your answers are saved locally.');
      } else if (isTimeoutError(result.error)) {
        setSubmitError('The server took too long to respond. Please try again — your answers are saved.');
      } else if (result.error.code === 'CONFLICT') {
        setSubmitError('A profile already exists for this payment. Continuing to the next step...');
        conflictTimerRef.current = setTimeout(() => { if (mountedRef.current) navigate(ROUTES.DIAGNOSTIC); }, 1200);
      } else {
        setSubmitError('Something went wrong. Please try again. Your answers are saved.');
      }
      return;
    }

    const { candidateCode } = result.data;

    setCandidateDetails(form);
    setCandidateCode(candidateCode);
    dispatch({ type: 'SET_STEP', payload: 'diagnostic' });

    Analytics.profileFormCompleted(candidateCode);
    LeadCapture.onProfileFilled(
      candidateCode,
      form.email.trim(),
      form.name.trim(),
      form.phone.trim() || undefined,
    );
    localStorage.removeItem(AUTOSAVE_KEY);

    setSaved(true);

    await new Promise((r) => setTimeout(r, 400));
    navigate(ROUTES.DIAGNOSTIC);
  }

  if (!state.paymentCompleted || !state.paymentRef) {
    return (
      <div className="min-h-screen bg-[#F2F6FB] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#1A73E8]/30 border-t-[#1A73E8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F6FB]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#1F2937] text-sm">QualScore</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={[
                    'h-1.5 rounded-full transition-all',
                    n === 2 ? 'w-6 bg-[#1A73E8]' : n < 2 ? 'w-4 bg-[#34A853]' : 'w-4 bg-[#E5E7EB]',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="text-xs text-[#6B7280] font-medium">Step 2 of 4</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] mb-2">
            Tell us about your career profile
          </h1>
          <p className="text-[#6B7280]">
            This helps us personalize your employability diagnostic report.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8 space-y-6">

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#6B7280]">Profile completion</span>
                    <span className="text-xs font-semibold text-[#1A73E8]">{completedCount}/{requiredFields.length} fields</span>
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1A73E8] transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Personal Info */}
                <div className="border-b border-[#F3F4F6] pb-5">
                  <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-[#1A73E8]" />
                    <span className="text-sm font-bold text-[#1F2937] uppercase tracking-wide">Personal Info</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div data-error={!!errors.name || undefined}>
                      <FieldLabel required>Full Name</FieldLabel>
                      <InputBase
                        placeholder="e.g. Priya Sharma"
                        value={form.name}
                        onChange={set('name')}
                        hasError={!!errors.name}
                        autoComplete="name"
                        icon={User}
                      />
                      <FieldError message={errors.name} />
                    </div>
                    <div data-error={!!errors.phone || undefined}>
                      <FieldLabel required>Mobile Number</FieldLabel>
                      <InputBase
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={set('phone')}
                        onBlur={handlePhoneBlur}
                        hasError={!!errors.phone}
                        autoComplete="tel"
                        icon={Phone}
                      />
                      <FieldError message={errors.phone} />
                    </div>
                    <div data-error={!!errors.email || undefined}>
                      <FieldLabel required>Email Address</FieldLabel>
                      <InputBase
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={set('email')}
                        onBlur={handleEmailBlur}
                        hasError={!!errors.email}
                        autoComplete="email"
                        icon={Mail}
                      />
                      <FieldError message={errors.email} />
                    </div>
                    <div data-error={!!errors.location || undefined}>
                      <FieldLabel required>Location / City</FieldLabel>
                      <InputBase
                        placeholder="e.g. Bangalore, Mumbai"
                        value={form.location}
                        onChange={set('location')}
                        hasError={!!errors.location}
                        icon={MapPin}
                      />
                      <FieldError message={errors.location} />
                    </div>
                  </div>
                </div>

                {/* Career Details */}
                <div className="border-b border-[#F3F4F6] pb-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Briefcase className="w-4 h-4 text-[#1A73E8]" />
                    <span className="text-sm font-bold text-[#1F2937] uppercase tracking-wide">Career Details</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div data-error={!!errors.jobRole || undefined}>
                      <FieldLabel required>Current Role</FieldLabel>
                      <InputBase
                        placeholder="e.g. Software Engineer"
                        value={form.jobRole}
                        onChange={set('jobRole')}
                        hasError={!!errors.jobRole}
                        icon={Briefcase}
                      />
                      <FieldError message={errors.jobRole} />
                    </div>
                    <div data-error={!!errors.yearsExperience || undefined}>
                      <FieldLabel required>Total Experience</FieldLabel>
                      <SelectBase
                        value={form.yearsExperience}
                        onChange={set('yearsExperience')}
                        hasError={!!errors.yearsExperience}
                      >
                        {EXPERIENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </SelectBase>
                      <FieldError message={errors.yearsExperience} />
                    </div>
                    <div data-error={!!errors.careerStage || undefined}>
                      <FieldLabel required>Career Stage</FieldLabel>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(['fresher', 'working_professional'] as CareerStage[]).map((stage) => {
                          const labels: Record<CareerStage, string> = {
                            fresher:              'Fresher',
                            working_professional: 'Working Professional',
                          };
                          const isActive = form.careerStage === stage;
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => setCareerStage(stage)}
                              className={[
                                'px-3 py-3 rounded-xl border-2 text-xs font-semibold text-center transition-all',
                                isActive
                                  ? 'border-[#1A73E8] bg-[#E8F1FD] text-[#1A73E8]'
                                  : errors.careerStage
                                  ? 'border-red-400 text-[#6B7280] hover:border-[#1A73E8]/40 hover:bg-[#F8FAFE]'
                                  : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#1A73E8]/40 hover:bg-[#F8FAFE]',
                              ].join(' ')}
                            >
                              {labels[stage]}
                            </button>
                          );
                        })}
                      </div>
                      <FieldError message={errors.careerStage} />
                    </div>
                    <div data-error={!!errors.industry || undefined}>
                      <FieldLabel required>Industry / Domain</FieldLabel>
                      <SelectBase
                        value={form.industry}
                        onChange={set('industry')}
                        hasError={!!errors.industry}
                      >
                        <option value="">Select industry</option>
                        {INDUSTRY_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </SelectBase>
                      <FieldError message={errors.industry} />
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    <span className="text-sm font-bold text-[#1F2937] uppercase tracking-wide">LinkedIn Profile</span>
                  </div>

                  <div data-error={!!errors.linkedinUrl || undefined}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-[#1F2937]">
                        LinkedIn Profile URL<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setLinkedinHelpOpen((v) => !v)}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#1A73E8] hover:text-[#1557B0] transition-colors"
                        aria-expanded={linkedinHelpOpen}
                      >
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        How to find your URL
                        {linkedinHelpOpen
                          ? <ChevronUp className="w-3 h-3 shrink-0" />
                          : <ChevronDown className="w-3 h-3 shrink-0" />
                        }
                      </button>
                    </div>

                    {linkedinHelpOpen && (
                      <div className="mb-3 rounded-xl border border-[#DBEAFE] bg-[#F0F7FF] px-4 py-3 space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-[#DBEAFE]">
                          <Linkedin className="w-3.5 h-3.5 text-[#0A66C2] shrink-0" />
                          <span className="text-xs font-semibold text-[#1E3A5F]">Finding your LinkedIn profile URL</span>
                        </div>
                        <ol className="space-y-2">
                          {[
                            { step: '1', text: 'Open LinkedIn and go to your profile page' },
                            { step: '2', text: 'Copy the URL from your browser\'s address bar' },
                            { step: '3', text: 'Paste it here — it should look like the example below' },
                          ].map(({ step, text }) => (
                            <li key={step} className="flex items-start gap-2.5">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-[#1A73E8] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {step}
                              </span>
                              <span className="text-xs text-[#1E3A5F] leading-relaxed">{text}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="flex items-center gap-2 pt-0.5">
                          <code className="text-[11px] font-mono bg-white border border-[#DBEAFE] text-[#0A66C2] px-2.5 py-1 rounded-lg select-all leading-snug">
                            linkedin.com/in/yourname
                          </code>
                          <span className="text-[10px] text-[#6B7280]">personal profile only</span>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A66C2] pointer-events-none" />
                      <input
                        type="url"
                        placeholder="https://www.linkedin.com/in/yourname"
                        value={form.linkedinUrl}
                        onChange={handleLinkedInChange}
                        onBlur={handleLinkedInBlur}
                        autoComplete="url"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={[
                          'w-full rounded-xl border pl-10 py-3 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none transition-all duration-150',
                          'focus:ring-2',
                          errors.linkedinUrl
                            ? 'border-amber-400 bg-amber-50/60 focus:ring-amber-300/30 focus:border-amber-400 pr-10'
                            : !errors.linkedinUrl && linkedInTouched && form.linkedinUrl && !linkedInReason
                            ? 'border-[#34A853] bg-[#F6FEF8] focus:ring-[#34A853]/20 focus:border-[#34A853] pr-10'
                            : 'border-[#E5E7EB] bg-white hover:border-[#1A73E8]/40 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] pr-4',
                        ].join(' ')}
                      />
                      {/* Right-side status icon */}
                      {errors.linkedinUrl && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                      )}
                      {!errors.linkedinUrl && linkedInTouched && form.linkedinUrl && !linkedInReason && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#34A853] pointer-events-none" />
                      )}
                    </div>

                    {/* Contextual error block */}
                    {errors.linkedinUrl && linkedInTouched && (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700 leading-snug">
                            {linkedInReason === 'wrong-path'
                              ? 'This looks like a LinkedIn page, but not a personal profile URL.'
                              : linkedInReason === 'not-linkedin'
                              ? 'This doesn\'t appear to be a LinkedIn URL.'
                              : linkedInReason === 'empty'
                              ? 'LinkedIn profile URL is required.'
                              : 'Please enter a valid LinkedIn personal profile URL.'}
                          </p>
                        </div>
                        <div className="flex items-start gap-2 pl-5">
                          <p className="text-xs text-amber-600 leading-relaxed">
                            {linkedInReason === 'wrong-path'
                              ? 'Use your personal /in/ profile link, not a company, job, post, or school page.'
                              : 'Your personal profile URL looks like:'}
                          </p>
                        </div>
                        {linkedInReason !== 'wrong-path' && (
                          <div className="pl-5">
                            <code className="text-[11px] font-mono bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md select-all">
                              https://www.linkedin.com/in/yourname
                            </code>
                          </div>
                        )}
                        {linkedInReason === 'wrong-path' && (
                          <div className="pl-5">
                            <code className="text-[11px] font-mono bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md select-all">
                              https://www.linkedin.com/in/yourname
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Success nudge */}
                    {!errors.linkedinUrl && linkedInTouched && form.linkedinUrl && !linkedInReason && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#34A853] shrink-0" />
                        <p className="text-xs text-[#34A853] font-medium">Looks good!</p>
                      </div>
                    )}

                    {/* Helper text — only show when no error */}
                    {!errors.linkedinUrl && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Info className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#9CA3AF] leading-relaxed">
                          Use your personal profile URL, not a post, company page, or job link.
                        </p>
                      </div>
                    )}
                    {!errors.linkedinUrl && (
                      <div className="flex items-start gap-1.5 mt-1.5 bg-[#F0F7FF] rounded-lg px-3 py-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#1A73E8] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#1A73E8]">
                          Accurate profile input helps generate a better diagnostic report.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Enrichment prompt */}
                  <div className="mt-5 rounded-2xl border border-[#E0EDFF] bg-gradient-to-br from-[#F0F7FF] to-[#F8FBFF] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEnrichmentOpen((v) => !v)}
                      className="w-full flex items-start gap-3 px-5 py-4 text-left group"
                      aria-expanded={enrichmentOpen}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#1A73E8]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-[#1A73E8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#1F2937]">Improve your diagnostic accuracy</span>
                          {enrichedFieldCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A73E8] text-white text-[10px] font-bold">
                              <Star className="w-2.5 h-2.5" />
                              {enrichedFieldCount} added
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                          Paste key details from your LinkedIn profile for a more precise, personalized report.
                        </p>
                      </div>
                      <div className="shrink-0 ml-2 mt-1 text-[#9CA3AF] group-hover:text-[#1A73E8] transition-colors">
                        {enrichmentOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {enrichmentOpen && (
                      <div className="px-5 pb-5 space-y-5 border-t border-[#E0EDFF]">
                        <div className="flex items-start gap-2 pt-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-1.5 shrink-0" />
                          <p className="text-xs text-[#4B5563] leading-relaxed">
                            All fields below are optional. Adding them helps the AI reference real profile signals instead of estimates — resulting in more specific insights.
                          </p>
                        </div>

                        {/* Headline */}
                        <div>
                          <FieldLabel>LinkedIn Headline</FieldLabel>
                          <InputBase
                            placeholder="e.g. Senior Product Manager | FinTech | ex-Flipkart"
                            value={form.linkedinHeadline || ''}
                            onChange={set('linkedinHeadline')}
                            maxLength={220}
                          />
                          <p className="text-xs text-[#9CA3AF] mt-1.5">Copy your headline directly from your LinkedIn profile page.</p>
                        </div>

                        {/* About */}
                        <div>
                          <FieldLabel>About / Summary</FieldLabel>
                          <TextareaBase
                            placeholder="Paste your LinkedIn About section here..."
                            value={form.linkedinAboutText || ''}
                            onChange={setTextarea('linkedinAboutText')}
                            maxLength={3000}
                            rows={4}
                          />
                          <p className="text-xs text-[#9CA3AF] mt-1.5">Your LinkedIn "About" section — helps the AI understand your professional positioning.</p>
                        </div>

                        {/* Experience */}
                        <div>
                          <FieldLabel>Recent Experience</FieldLabel>
                          <TextareaBase
                            placeholder="e.g. Senior PM at Razorpay (2021–present): Led payments checkout redesign, 3× conversion improvement, team of 8 engineers..."
                            value={form.linkedinExperienceText || ''}
                            onChange={setTextarea('linkedinExperienceText')}
                            maxLength={5000}
                            rows={5}
                          />
                          <p className="text-xs text-[#9CA3AF] mt-1.5">Paste 1–3 recent roles with brief descriptions. The more specific, the better the analysis.</p>
                        </div>

                        {/* Achievements */}
                        <div>
                          <FieldLabel>Key Projects or Achievements</FieldLabel>
                          <TextareaBase
                            placeholder="e.g. Built a real-time fraud detection system reducing chargebacks by 40%. Led cross-functional team of 12 to ship mobile app in 3 months..."
                            value={form.linkedinAchievements || ''}
                            onChange={setTextarea('linkedinAchievements')}
                            maxLength={2000}
                            rows={4}
                          />
                          <p className="text-xs text-[#9CA3AF] mt-1.5">Notable results, awards, or delivered outcomes. These strengthen your proof-of-work signals.</p>
                        </div>

                        <div className="flex items-start gap-2.5 bg-white rounded-xl border border-[#E0EDFF] px-4 py-3">
                          <ShieldCheck className="w-4 h-4 text-[#34A853] mt-0.5 shrink-0" />
                          <p className="text-xs text-[#4B5563] leading-relaxed">
                            This data is used only to generate your report. It is not shared with third parties or used to contact your current employer.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 mt-4 bg-[#F2F6FB] rounded-xl px-4 py-3">
                    <Clock className="w-4 h-4 text-[#1A73E8] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#4B5563] leading-relaxed">
                      Your form progress is saved automatically. You can safely refresh this page without losing your data.
                    </p>
                  </div>
                </div>

                {/* Global error */}
                {submitError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}

                {/* Success flash */}
                {saved && (
                  <div className="flex items-center gap-2.5 bg-[#E6F4EA] border border-[#34A853]/30 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 text-[#34A853] shrink-0" />
                    <p className="text-sm text-[#34A853] font-semibold">Profile saved! Taking you to the diagnostic...</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || saved || (!!errors.linkedinUrl && !!form.linkedinUrl.trim())}
                  aria-busy={loading}
                  className={[
                    'w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-bold text-base text-white transition-all duration-150',
                    saved
                      ? 'bg-[#34A853] cursor-default'
                      : loading
                      ? 'bg-[#1A73E8]/70 cursor-wait'
                      : (errors.linkedinUrl && form.linkedinUrl.trim())
                      ? 'bg-[#1A73E8]/40 cursor-not-allowed'
                      : 'bg-[#1A73E8] hover:bg-[#1557B0] active:scale-[0.99] shadow-md hover:shadow-lg',
                  ].join(' ')}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      Saving your profile...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      Saved! Redirecting...
                    </>
                  ) : (
                    <>
                      Continue to Diagnostic Questions
                      <ArrowRight className="w-5 h-5 shrink-0" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-[#9CA3AF]">
                  All fields are required. Your data is 100% confidential.
                </p>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1">
            <SidePanel candidateCode={state.candidateCode} />
          </div>
        </div>
      </main>
    </div>
  );
}
