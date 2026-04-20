import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  FlowState, FlowStep, CandidateDetails, DiagnosticAnswer,
  BackendDiagnosticAnswer, ReportData, FinalScore, BookingDetails,
  AnalysisRunStatus, PaymentVerificationState,
} from '../types';

const STORAGE_KEY = 'qualScore_flow_state';
const STORAGE_VERSION = 2;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const IS_DEV = import.meta.env.DEV;

function logFlow(action: string, detail?: Record<string, unknown>): void {
  if (!IS_DEV) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.debug(`[Flow ${ts}] ${action}`, detail ?? '');
}

const initialState: FlowState = {
  step: 'landing',
  paymentCompleted: false,
  paymentRef: null,
  paymentOrderId: null,
  paymentGatewayOrderId: null,
  paymentGatewayPaymentId: null,
  paymentGatewaySignature: null,
  paymentVerificationState: 'INITIATED',
  candidateDetails: null,
  candidateCode: null,
  linkedinUrlError: null,
  answers: [],
  backendAnswers: [],
  diagnosticSubmitted: false,
  analysisStatus: 'idle',
  reportData: null,
  evaluation: null,
  leadId: null,
  sessionId: null,
  consultationBooked: false,
  bookingDetails: null,
};

type FlowAction =
  | { type: 'SET_STEP'; payload: FlowStep }
  | { type: 'SET_PAYMENT_INITIATED'; payload: { gatewayOrderId: string; paymentRef: string } }
  | { type: 'SET_PAYMENT_PENDING_VERIFICATION'; payload: { gatewayOrderId: string; gatewayPaymentId: string; gatewaySignature: string } }
  | { type: 'SET_PAYMENT_VERIFICATION_STATE'; payload: PaymentVerificationState }
  | { type: 'COMPLETE_PAYMENT'; payload: { paymentRef: string; paymentOrderId: string; gatewayOrderId?: string } }
  | { type: 'SET_CANDIDATE_DETAILS'; payload: CandidateDetails }
  | { type: 'SET_CANDIDATE_CODE'; payload: string }
  | { type: 'SET_LINKEDIN_URL_ERROR'; payload: string | null }
  | { type: 'SET_LEAD_ID'; payload: string }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_ANSWERS'; payload: DiagnosticAnswer[] }
  | { type: 'ADD_ANSWER'; payload: DiagnosticAnswer }
  | { type: 'SET_DIAGNOSTIC_SUBMITTED'; payload: BackendDiagnosticAnswer[] }
  | { type: 'SET_ANALYSIS_STATUS'; payload: AnalysisRunStatus }
  | { type: 'SET_REPORT'; payload: ReportData }
  | { type: 'SET_EVALUATION'; payload: FinalScore }
  | { type: 'SET_BOOKING'; payload: BookingDetails }
  | { type: 'RESET' };

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_PAYMENT_INITIATED':
      return {
        ...state,
        paymentRef: action.payload.paymentRef,
        paymentGatewayOrderId: action.payload.gatewayOrderId,
        paymentVerificationState: 'INITIATED',
      };
    case 'SET_PAYMENT_PENDING_VERIFICATION':
      return {
        ...state,
        paymentGatewayOrderId: action.payload.gatewayOrderId,
        paymentGatewayPaymentId: action.payload.gatewayPaymentId,
        paymentGatewaySignature: action.payload.gatewaySignature,
        paymentVerificationState: 'PENDING_VERIFICATION',
      };
    case 'SET_PAYMENT_VERIFICATION_STATE':
      return { ...state, paymentVerificationState: action.payload };
    case 'COMPLETE_PAYMENT':
      return {
        ...state,
        paymentCompleted: true,
        paymentRef: action.payload.paymentRef,
        paymentOrderId: action.payload.paymentOrderId,
        paymentGatewayOrderId: action.payload.gatewayOrderId ?? state.paymentGatewayOrderId,
        paymentVerificationState: 'VERIFIED',
      };
    case 'SET_CANDIDATE_DETAILS':
      return { ...state, candidateDetails: action.payload };
    case 'SET_CANDIDATE_CODE':
      return { ...state, candidateCode: action.payload };
    case 'SET_LINKEDIN_URL_ERROR':
      return { ...state, linkedinUrlError: action.payload };
    case 'SET_LEAD_ID':
      return { ...state, leadId: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_ANSWERS':
      return { ...state, answers: action.payload };
    case 'ADD_ANSWER': {
      const existing = state.answers.filter((a) => a.questionId !== action.payload.questionId);
      return { ...state, answers: [...existing, action.payload] };
    }
    case 'SET_DIAGNOSTIC_SUBMITTED':
      return { ...state, backendAnswers: action.payload, diagnosticSubmitted: true };
    case 'SET_ANALYSIS_STATUS':
      return { ...state, analysisStatus: action.payload };
    case 'SET_REPORT':
      return { ...state, reportData: action.payload };
    case 'SET_EVALUATION':
      return { ...state, evaluation: action.payload };
    case 'SET_BOOKING':
      return { ...state, consultationBooked: true, bookingDetails: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface FlowContextValue {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
  goTo: (step: FlowStep) => void;
  setPaymentInitiated: (gatewayOrderId: string, paymentRef: string) => void;
  setPaymentPendingVerification: (gatewayOrderId: string, gatewayPaymentId: string, gatewaySignature: string) => void;
  setPaymentVerificationState: (vs: PaymentVerificationState) => void;
  completePayment: (paymentRef: string, paymentOrderId: string, gatewayOrderId?: string) => void;
  setCandidateDetails: (details: CandidateDetails) => void;
  setCandidateCode: (code: string) => void;
  setLinkedinUrlError: (message: string | null) => void;
  addAnswer: (answer: DiagnosticAnswer) => void;
  setReport: (report: ReportData) => void;
  setEvaluation: (evaluation: FinalScore) => void;
  setBooking: (details: BookingDetails) => void;
  reset: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

interface PersistedFlowEnvelope {
  version: number;
  savedAt: number;
  state: FlowState;
}

function loadPersistedState(init: FlowState): FlowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return init;

    const envelope = JSON.parse(raw) as Partial<PersistedFlowEnvelope>;

    if (envelope.version !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      logFlow('cleared stale storage (version mismatch)', { persisted: envelope.version, current: STORAGE_VERSION });
      return init;
    }

    if (typeof envelope.savedAt === 'number' && Date.now() - envelope.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      logFlow('cleared expired session', { ageMs: Date.now() - envelope.savedAt });
      return init;
    }

    const parsed = envelope.state as FlowState;
    if (!parsed || typeof parsed !== 'object') return init;

    const VALID_STEPS: FlowStep[] = ['landing', 'checkout', 'details', 'diagnostic', 'analysis', 'report', 'booking'];
    if (parsed.step && !VALID_STEPS.includes(parsed.step)) {
      logFlow('cleared state with unrecognized step', { step: parsed.step });
      localStorage.removeItem(STORAGE_KEY);
      return init;
    }

    const hydrated: FlowState = {
      ...init,
      ...parsed,
      backendAnswers: parsed.backendAnswers ?? [],
      diagnosticSubmitted: parsed.diagnosticSubmitted ?? false,
      analysisStatus: parsed.analysisStatus ?? 'idle',
      paymentGatewayOrderId: parsed.paymentGatewayOrderId ?? null,
      paymentGatewayPaymentId: parsed.paymentGatewayPaymentId ?? null,
      paymentGatewaySignature: parsed.paymentGatewaySignature ?? null,
      paymentVerificationState: parsed.paymentVerificationState ?? 'INITIATED',
    };

    logFlow('hydrated from localStorage', {
      step: hydrated.step,
      paymentCompleted: hydrated.paymentCompleted,
      candidateCode: hydrated.candidateCode,
      diagnosticSubmitted: hydrated.diagnosticSubmitted,
      analysisStatus: hydrated.analysisStatus,
    });
    return hydrated;
  } catch {
    logFlow('failed to parse saved state — using fresh session');
    return init;
  }
}

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialState, loadPersistedState);

  useEffect(() => {
    try {
      const envelope: PersistedFlowEnvelope = {
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        state,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // storage quota exceeded or private browsing — non-fatal
    }
  }, [state]);

  const goTo = (step: FlowStep) => {
    logFlow('goTo', { step });
    dispatch({ type: 'SET_STEP', payload: step });
  };
  const setPaymentInitiated = (gatewayOrderId: string, paymentRef: string) => {
    logFlow('setPaymentInitiated', { gatewayOrderId, paymentRef });
    dispatch({ type: 'SET_PAYMENT_INITIATED', payload: { gatewayOrderId, paymentRef } });
  };
  const setPaymentPendingVerification = (gatewayOrderId: string, gatewayPaymentId: string, gatewaySignature: string) => {
    logFlow('setPaymentPendingVerification', { gatewayOrderId, gatewayPaymentId });
    dispatch({ type: 'SET_PAYMENT_PENDING_VERIFICATION', payload: { gatewayOrderId, gatewayPaymentId, gatewaySignature } });
  };
  const setPaymentVerificationState = (vs: PaymentVerificationState) => {
    logFlow('setPaymentVerificationState', { state: vs });
    dispatch({ type: 'SET_PAYMENT_VERIFICATION_STATE', payload: vs });
  };
  const completePayment = (paymentRef: string, paymentOrderId: string, gatewayOrderId?: string) => {
    logFlow('completePayment', { paymentRef, paymentOrderId, gatewayOrderId });
    dispatch({ type: 'COMPLETE_PAYMENT', payload: { paymentRef, paymentOrderId, gatewayOrderId } });
  };
  const setCandidateDetails = (details: CandidateDetails) => {
    logFlow('setCandidateDetails', { email: details.email, jobRole: details.jobRole });
    dispatch({ type: 'SET_CANDIDATE_DETAILS', payload: details });
  };
  const setCandidateCode = (code: string) => {
    logFlow('setCandidateCode', { code });
    dispatch({ type: 'SET_CANDIDATE_CODE', payload: code });
  };
  const setLinkedinUrlError = (message: string | null) => {
    logFlow('setLinkedinUrlError', { message });
    dispatch({ type: 'SET_LINKEDIN_URL_ERROR', payload: message });
  };
  const addAnswer = (answer: DiagnosticAnswer) => {
    dispatch({ type: 'ADD_ANSWER', payload: answer });
  };
  const setReport = (report: ReportData) => {
    logFlow('setReport', { overallScore: report.overallScore, scoreLevel: report.scoreLevel });
    dispatch({ type: 'SET_REPORT', payload: report });
  };
  const setEvaluation = (evaluation: FinalScore) => {
    logFlow('setEvaluation', { finalEmployabilityScore: evaluation.finalEmployabilityScore, band: evaluation.band });
    dispatch({ type: 'SET_EVALUATION', payload: evaluation });
  };
  const setBooking = (details: BookingDetails) => {
    logFlow('setBooking', { bookingRef: details.bookingRef, date: details.date });
    dispatch({ type: 'SET_BOOKING', payload: details });
  };
  const reset = () => {
    logFlow('reset');
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'RESET' });
  };

  return (
    <FlowContext.Provider
      value={{
        state,
        dispatch,
        goTo,
        setPaymentInitiated,
        setPaymentPendingVerification,
        setPaymentVerificationState,
        completePayment,
        setCandidateDetails,
        setCandidateCode,
        setLinkedinUrlError,
        addAnswer,
        setReport,
        setEvaluation,
        setBooking,
        reset,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used within FlowProvider');
  return ctx;
}
