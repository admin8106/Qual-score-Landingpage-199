import { CheckCircle, AlertCircle, RefreshCw, Loader2, Mail, MessageCircle } from 'lucide-react';

const SUPPORT_EMAIL = 'support@qualscore.in';
const SUPPORT_WHATSAPP = 'https://wa.me/919999999999';

interface VerifyingScreenProps {
  message?: string;
}

export function PaymentVerifyingScreen({ message = 'Verifying your payment...' }: VerifyingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] text-center px-6 py-10">
      <div className="w-16 h-16 bg-[#E8F1FD] rounded-full flex items-center justify-center mb-5">
        <Loader2 className="w-8 h-8 text-[#1A73E8] animate-spin" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] mb-2">{message}</h2>
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed">
        Please wait and do not close this tab. This usually takes a few seconds.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-[#9CA3AF]">
        <div className="w-2 h-2 bg-[#1A73E8] rounded-full animate-pulse" />
        Communicating with payment server
      </div>
    </div>
  );
}

interface PaymentSuccessScreenProps {
  paymentRef: string;
  onContinue: () => void;
}

export function PaymentSuccessScreen({ paymentRef, onContinue }: PaymentSuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] text-center px-6 py-10">
      <div className="w-16 h-16 bg-[#E6F4EA] rounded-full flex items-center justify-center mb-5">
        <CheckCircle className="w-8 h-8 text-[#34A853]" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] mb-2">Payment confirmed!</h2>
      <p className="text-sm text-[#6B7280] mb-1">Your diagnostic has been unlocked.</p>
      {paymentRef && (
        <p className="text-xs text-[#9CA3AF] mb-6 font-mono">Ref: {paymentRef}</p>
      )}
      <button
        onClick={onContinue}
        className="flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        Continue to next step
      </button>
    </div>
  );
}

interface PaymentFailureScreenProps {
  errorMsg: string;
  isRetrying?: boolean;
  onRetry: () => void;
}

export function PaymentFailureScreen({ errorMsg, isRetrying, onRetry }: PaymentFailureScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] text-center px-6 py-10">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] mb-2">Payment not confirmed</h2>
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed mb-6">
        {errorMsg}
      </p>

      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mb-5"
      >
        {isRetrying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        Try again
      </button>

      <SupportFallback />
    </div>
  );
}

interface PaymentUnknownScreenProps {
  paymentRef: string | null;
  isChecking: boolean;
  onCheckStatus: () => void;
  onRetry: () => void;
}

export function PaymentUnknownScreen({ paymentRef, isChecking, onCheckStatus, onRetry }: PaymentUnknownScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] text-center px-6 py-10">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-5">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] mb-2">Payment status unclear</h2>
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed mb-2">
        We could not confirm your payment at this time. If money was deducted from your account, it will reflect shortly.
      </p>
      {paymentRef && (
        <p className="text-xs text-[#9CA3AF] mb-6 font-mono">Your reference: {paymentRef}</p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onCheckStatus}
          disabled={isChecking}
          className="flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isChecking ? 'Checking...' : 'Check payment status'}
        </button>

        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 border border-[#E5E7EB] text-[#6B7280] font-medium px-7 py-3 rounded-2xl hover:border-[#1A73E8] hover:text-[#1A73E8] transition-all"
        >
          Start a new payment
        </button>
      </div>

      <div className="mt-6">
        <SupportFallback />
      </div>
    </div>
  );
}

function SupportFallback() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-left max-w-xs">
      <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        Payment deducted but not reflected?
      </p>
      <p className="text-xs text-amber-700 leading-relaxed mb-3">
        Don't worry — your money is safe. Contact us and we'll resolve it within 2 hours.
      </p>
      <div className="flex flex-col gap-2">
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Payment+deducted+not+reflected`}
          className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold hover:underline"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          {SUPPORT_EMAIL}
        </a>
        <a
          href={`${SUPPORT_WHATSAPP}?text=Payment+deducted+but+not+reflected`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold hover:underline"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          WhatsApp support
        </a>
      </div>
    </div>
  );
}
