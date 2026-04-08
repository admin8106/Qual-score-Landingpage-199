import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Lock, CheckCircle, CreditCard,
  Smartphone, ArrowRight, Clock, Linkedin,
  BarChart2, FileText, AlertCircle, ChevronRight,
  Zap, Award, RefreshCw,
} from 'lucide-react';
import { useFlow } from '../context/FlowContext';
import { paymentsApi, submitPayUForm } from '../api/services/payments';
import { Analytics, track as analyticsTrack } from '../services/analyticsService';
import { friendlyMessage, isNetworkError, isTimeoutError } from '../utils/errorUtils';
import { PRODUCT_NAME, PRODUCT_PRICE, ORIGINAL_PRICE, PRODUCT_CURRENCY, buildRazorpayOptions } from '../services/paymentService';
import { env } from '../config/env';
import { ROUTES } from '../constants/routes';
import { LeadCapture } from '../services/leadCaptureService';
import {
  PaymentVerifyingScreen,
  PaymentFailureScreen,
  PaymentUnknownScreen,
  PaymentSuccessScreen,
} from '../components/payment/PaymentStatusScreens';

type PayStage =
  | 'idle'
  | 'initiating'
  | 'gateway_open'
  | 'verifying'
  | 'checking_status'
  | 'success'
  | 'failed'
  | 'unknown';

const NEXT_STEPS = [
  {
    num: '01',
    icon: Lock,
    label: 'Complete payment of ₹199',
    sub: 'One-time · No subscription · Instant access',
  },
  {
    num: '02',
    icon: Linkedin,
    label: 'Submit your LinkedIn profile and career details',
    sub: 'Takes about 2 minutes',
  },
  {
    num: '03',
    icon: FileText,
    label: 'Answer the diagnostic questions',
    sub: '15 focused questions · Under 8 minutes',
  },
  {
    num: '04',
    icon: BarChart2,
    label: 'Get your personalized report',
    sub: 'Score + blockers + next-step recommendation',
  },
];

const INCLUSIONS = [
  'Personalized employability score (0–100)',
  'Based on your LinkedIn profile and responses',
  'Breakdown across 5 career dimensions',
  'Top shortlisting blockers identified',
  'Clear next-step recommendation',
  'Takes only 10–12 minutes — not a generic quiz',
];

const PAYMENT_METHODS = [
  { label: 'UPI', sub: 'GPay · PhonePe · Paytm' },
  { label: 'Cards', sub: 'Visa · Mastercard · Amex' },
  { label: 'Net Banking', sub: 'All major banks' },
];

const STAGE_LABELS: Record<PayStage, string> = {
  idle:           'Pay ₹199 and Continue',
  initiating:     'Creating payment order...',
  gateway_open:   'Waiting for payment...',
  verifying:      'Verifying payment...',
  checking_status:'Checking status...',
  success:        'Payment confirmed!',
  failed:         'Try again',
  unknown:        'Check status',
};

const STAGE_STEPS: { key: 'initiating' | 'verifying'; label: string }[] = [
  { key: 'initiating', label: 'Connecting to payment gateway' },
  { key: 'verifying',  label: 'Verifying payment' },
];

const FULL_SCREEN_STAGES: PayStage[] = ['verifying', 'checking_status', 'success', 'failed', 'unknown'];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    state,
    completePayment,
    goTo,
    setPaymentInitiated,
    setPaymentPendingVerification,
    setPaymentVerificationState,
  } = useFlow();

  const [stage, setStage]       = useState<PayStage>('idle');
  const [errorMsg, setErrorMsg]  = useState('');
  const submittingRef            = useRef(false);
  const mountedRef               = useRef(true);

  const isLoading = stage === 'initiating' || stage === 'verifying' || stage === 'checking_status';
  const isFullScreen = FULL_SCREEN_STAGES.includes(stage);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (env.razorpayKeyId && !('Razorpay' in window)) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, []);

  // On mount: if payment already verified in flow, skip checkout
  useEffect(() => {
    if (state.paymentCompleted && state.paymentRef) {
      navigate(ROUTES.DETAILS, { replace: true });
      return;
    }

    // Recovery: if we have pending verification data from a previous session, re-check
    if (
      state.paymentVerificationState === 'PENDING_VERIFICATION' &&
      state.paymentRef &&
      !state.paymentCompleted
    ) {
      resumeVerificationFromState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeVerificationFromState = useCallback(async () => {
    if (!state.paymentRef) return;

    setStage('checking_status');

    const statusResult = await paymentsApi.getStatus(state.paymentRef);

    if (!mountedRef.current) return;

    if (statusResult.ok && statusResult.data.verified) {
      setStage('success');
      completePayment(statusResult.data.paymentReference, state.paymentRef ?? '');
      goTo('details');
      await new Promise((r) => setTimeout(r, 900));
      if (mountedRef.current) navigate(ROUTES.DETAILS);
      return;
    }

    if (statusResult.ok && statusResult.data.status === 'FAILED') {
      setPaymentVerificationState('FAILED');
      setStage('failed');
      setErrorMsg('Your previous payment attempt failed. Please try again.');
      submittingRef.current = false;
      return;
    }

    // Backend not yet settled — show UNKNOWN so user can check or retry
    setPaymentVerificationState('UNKNOWN');
    setStage('unknown');
    submittingRef.current = false;
  }, [state.paymentRef, completePayment, goTo, navigate, setPaymentVerificationState]);

  const checkPaymentStatus = useCallback(async () => {
    if (!state.paymentRef) return;

    setStage('checking_status');

    const statusResult = await paymentsApi.getStatus(state.paymentRef);

    if (!mountedRef.current) return;

    if (statusResult.ok && statusResult.data.verified) {
      setStage('success');
      completePayment(statusResult.data.paymentReference, state.paymentRef ?? '');
      goTo('details');
      await new Promise((r) => setTimeout(r, 900));
      if (mountedRef.current) navigate(ROUTES.DETAILS);
      return;
    }

    setStage('unknown');
  }, [state.paymentRef, completePayment, goTo, navigate]);

  const finishPayment = useCallback(async (
    gatewayOrderId: string,
    gatewayPaymentId: string,
    gatewaySignature: string,
    paymentReference?: string,
  ) => {
    setStage('verifying');
    setPaymentPendingVerification(gatewayOrderId, gatewayPaymentId, gatewaySignature);

    const effectiveRef = paymentReference ?? state.paymentRef ?? undefined;

    const verifyResult = await paymentsApi.verify({
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      paymentReference: effectiveRef,
    });

    if (!mountedRef.current) return;

    if (!verifyResult.ok || !verifyResult.data.verified) {
      let msg: string;

      if (!verifyResult.ok) {
        const err = verifyResult.error;
        if (isNetworkError(err) || isTimeoutError(err)) {
          // Network dropped during verify — check server-side status before failing user
          setPaymentVerificationState('UNKNOWN');
          setStage('unknown');
          submittingRef.current = false;
          return;
        }
        msg = friendlyMessage(err, 'Payment verification failed. Please try again.');
      } else {
        msg = 'Payment could not be verified. If money was deducted, please contact support.';
      }

      setPaymentVerificationState('FAILED');
      setErrorMsg(msg);
      setStage('failed');
      analyticsTrack('payment_failed', { page: '/checkout' });
      LeadCapture.onPaymentFailed(effectiveRef);
      submittingRef.current = false;
      return;
    }

    setStage('success');
    Analytics.paymentSuccess(verifyResult.data.paymentReference);
    LeadCapture.onPaymentDone(verifyResult.data.paymentReference);

    completePayment(
      verifyResult.data.paymentReference,
      gatewayPaymentId,
      gatewayOrderId,
    );

    goTo('details');

    await new Promise((r) => setTimeout(r, 700));
    if (mountedRef.current) navigate(ROUTES.DETAILS);
  }, [
    state.paymentRef,
    completePayment,
    goTo,
    navigate,
    setPaymentPendingVerification,
    setPaymentVerificationState,
  ]);

  const handlePay = useCallback(async () => {
    if (submittingRef.current || stage === 'success') return;
    submittingRef.current = true;
    setErrorMsg('');
    setStage('initiating');

    Analytics.paymentStarted();
    LeadCapture.onPaymentStarted();

    const initiateResult = await paymentsApi.initiate({
      amountPaise: PRODUCT_PRICE * 100,
    });

    if (!mountedRef.current) return;

    if (!initiateResult.ok) {
      const err = initiateResult.error;
      const msg = isNetworkError(err)
        ? 'No internet connection. Please check your network and try again.'
        : isTimeoutError(err)
        ? 'The payment server took too long to respond. Please try again.'
        : friendlyMessage(err, 'Payment could not be started. Please try again.');
      setErrorMsg(msg);
      setStage('failed');
      submittingRef.current = false;
      return;
    }

    const { paymentReference, gatewayOrderId, keyId, checkoutType, payuData } = initiateResult.data;

    // Persist initiated state so recovery can use paymentRef on refresh
    setPaymentInitiated(gatewayOrderId, paymentReference);

    if (checkoutType === 'RAZORPAY_MODAL') {
      const razorpayKey = keyId || env.razorpayKeyId;
      if (!razorpayKey || typeof window === 'undefined' || !('Razorpay' in window)) {
        setErrorMsg('Razorpay checkout could not be loaded. Please refresh and try again.');
        setStage('failed');
        submittingRef.current = false;
        return;
      }

      setStage('gateway_open');

      const options = buildRazorpayOptions(
        gatewayOrderId,
        razorpayKey,
        {
          amountPaise: PRODUCT_PRICE * 100,
          currency: PRODUCT_CURRENCY,
          productName: PRODUCT_NAME,
          description: 'Employability Diagnostic Report',
          prefill: { name: '', email: '', contact: '' },
        },
        async (result) => {
          if (!mountedRef.current) return;
          if (!result.paymentId || !result.orderId || !result.signature) {
            setErrorMsg('Payment response was incomplete. Please try again.');
            setStage('failed');
            submittingRef.current = false;
            return;
          }
          await finishPayment(result.orderId, result.paymentId, result.signature, paymentReference);
        },
        (errorCode) => {
          if (!mountedRef.current) return;
          if (errorCode === 'CANCELLED') {
            setErrorMsg('');
            setStage('idle');
          } else {
            setErrorMsg('Payment could not be completed. Please try again.');
            setStage('failed');
            analyticsTrack('payment_failed', { page: '/checkout', reason: errorCode });
          }
          submittingRef.current = false;
        },
      );
      const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay(options);
      rzp.open();
      return;
    }

    if (checkoutType === 'PAYU_FORM') {
      if (!payuData) {
        setErrorMsg('PayU checkout data is missing. Please try again.');
        setStage('failed');
        submittingRef.current = false;
        return;
      }
      sessionStorage.setItem('qualcore_payment_ref', paymentReference);
      const origin = window.location.origin;
      const surl = `${origin}/payment/return?ref=${encodeURIComponent(paymentReference)}`;
      const furl = `${origin}/payment/failed?ref=${encodeURIComponent(paymentReference)}`;
      submitPayUForm(payuData, surl, furl);
      return;
    }

    // MOCK checkout — synthetic payment ID keeps gateway_payment_id distinct from the payment reference
    const mockPaymentId = `mock_pay_${Date.now()}`;
    await finishPayment(gatewayOrderId, mockPaymentId, btoa(`${gatewayOrderId}|${mockPaymentId}`), paymentReference);
  }, [stage, finishPayment, setPaymentInitiated]);

  const handleRetry = useCallback(() => {
    submittingRef.current = false;
    setStage('idle');
    setErrorMsg('');
  }, []);

  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-[#F2F6FB] font-sans">
        <CheckoutHeader />
        <main className="max-w-lg mx-auto px-4 pt-16 pb-10">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            {(stage === 'verifying' || stage === 'checking_status') && (
              <PaymentVerifyingScreen
                message={stage === 'checking_status' ? 'Checking payment status...' : 'Verifying your payment...'}
              />
            )}
            {stage === 'success' && (
              <PaymentSuccessScreen
                paymentRef={state.paymentRef ?? ''}
                onContinue={() => navigate(ROUTES.DETAILS)}
              />
            )}
            {stage === 'failed' && (
              <PaymentFailureScreen
                errorMsg={errorMsg || 'Something went wrong with your payment. Please try again.'}
                onRetry={handleRetry}
              />
            )}
            {stage === 'unknown' && (
              <PaymentUnknownScreen
                paymentRef={state.paymentRef}
                isChecking={false}
                onCheckStatus={checkPaymentStatus}
                onRetry={handleRetry}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F6FB] font-sans">
      <CheckoutHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#E8F1FD] text-[#1A73E8] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 uppercase tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            Step 1 of 4
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-3 leading-tight">
            Start Your Employability Diagnostic
          </h1>
          <p className="text-[#6B7280] max-w-xl mx-auto leading-relaxed">
            You're one step away from understanding what may be blocking your shortlisting.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="font-bold text-[#1F2937] mb-5 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#1A73E8]" />
            What happens next
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NEXT_STEPS.map(({ num, icon: Icon, label, sub }) => (
              <div key={num} className="flex gap-3">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-8 h-8 bg-[#1A73E8] text-white rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
                    {num}
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-[#1F2937] leading-snug">{label}</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF] pl-5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-5">
            <OrderSummaryCard />
            <InclusionsCard />
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="bg-[#1F2937] px-6 py-5 text-center">
                <div className="text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-medium">
                  Total payable
                </div>
                <div className="text-4xl font-bold text-white mb-0.5">₹{PRODUCT_PRICE}</div>
                <div className="text-gray-400 text-sm line-through mb-2">₹{ORIGINAL_PRICE}</div>
                <div className="inline-flex items-center gap-1.5 bg-[#34A853]/20 text-[#34A853] text-xs font-bold px-3 py-1 rounded-full">
                  60% off · Limited time
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-center text-[#9CA3AF]">
                  All taxes inclusive · Final price ₹{PRODUCT_PRICE}
                </p>

                {stage === 'idle' && isLoading && <PaymentProgressSteps stage={stage} />}
                {(stage === 'initiating') && <PaymentProgressSteps stage={stage} />}

                {stage === 'gateway_open' && (
                  <div className="bg-[#E8F1FD] rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-[#1A73E8] font-medium">
                    <span className="w-3.5 h-3.5 border-2 border-[#1A73E8]/30 border-t-[#1A73E8] rounded-full animate-spin shrink-0" />
                    Payment window open — complete payment there
                  </div>
                )}

                <PayButton
                  stage={stage}
                  isLoading={isLoading || stage === 'gateway_open'}
                  stageLabel={STAGE_LABELS[stage]}
                  onClick={handlePay}
                />

                {stage === 'idle' && (
                  <div className="flex items-start gap-2 bg-[#E6F4EA] border border-[#34A853]/20 rounded-xl px-3.5 py-2.5">
                    <Zap className="w-3.5 h-3.5 text-[#34A853] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#166534] leading-relaxed">
                      <span className="font-semibold">Your report is ready instantly</span> — delivered on screen within 12 minutes of completing the diagnostic. No waiting, no emails, no delays.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(({ label, sub }) => (
                    <div key={label} className="bg-[#F2F6FB] rounded-xl p-2 text-center border border-[#E5E7EB]">
                      <div className="text-xs font-semibold text-[#1F2937]">{label}</div>
                      <div className="text-[10px] text-[#9CA3AF] leading-tight">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                    <Lock className="w-3 h-3 text-[#34A853]" />
                    256-bit SSL
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                    <Shield className="w-3 h-3 text-[#34A853]" />
                    Razorpay
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                    <Smartphone className="w-3 h-3 text-[#1A73E8]" />
                    UPI / Cards
                  </div>
                </div>
              </div>
            </div>

            <TrustCards />

            <p className="text-xs text-[#9CA3AF] text-center leading-relaxed px-2">
              This is a diagnostic service, not a job guarantee or placement program. QualScore does not promise interviews, shortlists, or employment outcomes.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white mt-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#1A73E8] rounded-md flex items-center justify-center">
              <Award className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-[#1F2937]">
              Qual<span className="text-[#1A73E8]">Score</span>
            </span>
            <span className="text-xs text-[#9CA3AF] hidden sm:inline">· Employability Diagnostic · India</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#9CA3AF]">
            <a href="mailto:support@qualscore.in" className="hover:text-[#1A73E8] transition-colors flex items-center gap-1">
              <Shield className="w-3 h-3" />
              support@qualscore.in
            </a>
            <span>Diagnostic report · Not a job guarantee</span>
            <span>© {new Date().getFullYear()} QualScore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PaymentProgressSteps({ stage }: { stage: PayStage }) {
  const stageOrder = STAGE_STEPS.map((s) => s.key);
  const currentIdx = stageOrder.indexOf(stage as 'initiating' | 'verifying');

  return (
    <div className="bg-[#E8F1FD] rounded-xl px-4 py-3 space-y-2">
      {STAGE_STEPS.map(({ key, label }, thisIdx) => {
        const done   = thisIdx < currentIdx;
        const active = thisIdx === currentIdx;

        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-xs transition-opacity ${active || done ? 'opacity-100' : 'opacity-30'}`}
          >
            {done ? (
              <CheckCircle className="w-3.5 h-3.5 text-[#34A853] shrink-0" />
            ) : active ? (
              <span className="w-3.5 h-3.5 border-2 border-[#1A73E8]/30 border-t-[#1A73E8] rounded-full animate-spin shrink-0" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#D1D5DB] shrink-0" />
            )}
            <span className={`font-medium ${active ? 'text-[#1A73E8]' : done ? 'text-[#34A853]' : 'text-[#9CA3AF]'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CheckoutHeader() {
  return (
    <header className="bg-white border-b border-[#E5E7EB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-[#1F2937] tracking-tight">
            Qual<span className="text-[#1A73E8]">Score</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 bg-[#E6F4EA] text-[#34A853] text-xs font-semibold px-3 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Secure Checkout
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">256-bit encrypted</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function OrderSummaryCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
      <h2 className="font-bold text-[#1F2937] mb-5">Order Summary</h2>

      <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#F2F6FB] mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#E8F1FD] rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-[#1A73E8]" />
          </div>
          <div>
            <div className="font-semibold text-[#1F2937] leading-snug mb-0.5">
              Employability Diagnostic Report
            </div>
            <div className="text-xs text-[#9CA3AF]">
              Product: {PRODUCT_NAME}
            </div>
            <div className="text-xs text-[#9CA3AF]">Instant digital report · One-time access</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-xl text-[#1F2937]">₹{PRODUCT_PRICE}</div>
          <div className="text-xs text-[#9CA3AF] line-through">₹{ORIGINAL_PRICE}</div>
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        {[
          { label: 'Diagnostic Report (1 seat)', value: `₹${PRODUCT_PRICE}` },
          { label: 'Taxes & fees', value: 'Included' },
          { label: 'Validity', value: 'Lifetime access' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-[#6B7280]">{label}</span>
            <span className="font-medium text-[#1F2937]">{value}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#F2F6FB] rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="font-bold text-[#1F2937]">Total Payable</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-2xl text-[#1F2937]">₹{PRODUCT_PRICE}</span>
          <span className="text-xs font-bold text-[#34A853] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
            60% OFF
          </span>
        </div>
      </div>
    </div>
  );
}

function InclusionsCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
      <h2 className="font-bold text-[#1F2937] mb-4 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-[#34A853]" />
        What's included
      </h2>
      <ul className="space-y-2.5">
        {INCLUSIONS.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-[#4B5563]">
            <CheckCircle className="w-4 h-4 text-[#34A853] mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center gap-2.5 bg-[#F2F6FB] rounded-xl px-3.5 py-3 border border-[#E5E7EB]">
        <Clock className="w-4 h-4 text-[#1A73E8] shrink-0" />
        <p className="text-xs text-[#6B7280]">
          <span className="font-semibold text-[#1F2937]">Estimated time:</span>{' '}
          10–12 minutes from start to report
        </p>
      </div>
    </div>
  );
}

function PayButton({
  stage,
  isLoading,
  stageLabel,
  onClick,
}: {
  stage: PayStage;
  isLoading: boolean;
  stageLabel: string;
  onClick: () => void;
}) {
  const isSuccess = stage === 'success';
  const isError   = stage === 'failed';

  return (
    <button
      onClick={onClick}
      disabled={isLoading || isSuccess}
      aria-busy={isLoading}
      className={[
        'w-full flex items-center justify-center gap-2.5 font-bold text-base px-6 py-4 rounded-2xl transition-all select-none',
        isSuccess
          ? 'bg-[#34A853] text-white cursor-default'
          : isError
          ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer'
          : isLoading
          ? 'bg-[#1A73E8]/80 text-white cursor-wait'
          : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer',
      ].join(' ')}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
      ) : isSuccess ? (
        <CheckCircle className="w-5 h-5 shrink-0" />
      ) : isError ? (
        <RefreshCw className="w-4 h-4 shrink-0" />
      ) : (
        <Lock className="w-4 h-4 shrink-0" />
      )}
      <span>{stageLabel}</span>
      {!isLoading && !isSuccess && !isError && (
        <ArrowRight className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
}

function TrustCards() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-[#E6F4EA] rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-[#34A853]" />
        </div>
        <div>
          <div className="font-semibold text-sm text-[#1F2937] mb-0.5">100% Confidential</div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Your data is never shared with recruiters, employers, or any third party.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-[#E8F1FD] rounded-xl flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-[#1A73E8]" />
        </div>
        <div>
          <div className="font-semibold text-sm text-[#1F2937] mb-0.5">Secure Payment</div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Powered by Razorpay. Card details are never stored on our servers. PCI-DSS compliant.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4">
        <div className="grid grid-cols-3 divide-x divide-[#F2F6FB]">
          <div className="text-center px-2">
            <div className="text-xl font-bold text-[#1A73E8]">2,400+</div>
            <div className="text-[10px] text-[#9CA3AF] leading-tight">Diagnostics done</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-[#34A853]">4.8/5</div>
            <div className="text-[10px] text-[#9CA3AF] leading-tight">Satisfaction</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-[#F9AB00]">68%</div>
            <div className="text-[10px] text-[#9CA3AF] leading-tight">Better results</div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="font-semibold text-sm text-amber-800 mb-0.5">Money deducted but not reflected?</div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Contact <a href="mailto:support@qualscore.in" className="underline font-medium">support@qualscore.in</a>. We resolve all payment issues within 2 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
