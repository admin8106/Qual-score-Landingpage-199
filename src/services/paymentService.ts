/**
 * Payment product constants and Razorpay SDK utility.
 *
 * The actual payment API calls (initiate / verify) are handled by
 * src/api/services/payments.ts via the Java Spring Boot backend.
 *
 * This file exists for:
 *   1. Product constants shared across pages
 *   2. buildRazorpayOptions() — used when the Razorpay checkout modal is integrated
 *
 * ─── Razorpay SDK integration (future) ───────────────────────────────────────
 *   When integrating the Razorpay checkout widget:
 *   1. Load script: <script src="https://checkout.razorpay.com/v1/checkout.js">
 *      (or use the dynamic loader pattern in CheckoutPage)
 *   2. Call paymentsApi.initiate() → receive gatewayOrderId + keyId
 *   3. Open modal: new (window as any).Razorpay(buildRazorpayOptions(...)).open()
 *   4. On success: call paymentsApi.verify() with the three IDs returned by the modal
 *   5. Store paymentReference from verify response in FlowContext
 *
 * ─── PayU alternative ────────────────────────────────────────────────────────
 *   Replace buildRazorpayOptions() with a buildPayUOptions() equivalent.
 *   PayU Bolt SDK: https://developer.payumoney.com/
 */

export const PRODUCT_NAME          = 'QualScore Employability Diagnostic Report';
export const PRODUCT_PRICE         = 199;
export const PRODUCT_CURRENCY      = 'INR';
export const PRODUCT_PRICE_DISPLAY = '₹199';
export const ORIGINAL_PRICE        = 499;

export interface PaymentConfig {
  amountPaise: number;
  currency: string;
  productName: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
  errorCode?: 'CANCELLED' | 'FAILED' | 'NETWORK_ERROR' | 'TIMEOUT';
}

export interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  capturedAt?: string;
}

export function buildRazorpayOptions(
  orderId: string,
  keyId: string,
  config: PaymentConfig,
  onSuccess: (response: PaymentResult) => void,
  onFailure: (errorCode: string) => void
) {
  return {
    key: keyId,
    amount: config.amountPaise,
    currency: config.currency,
    name: config.productName,
    description: config.description,
    order_id: orderId,
    prefill: config.prefill,
    theme: { color: '#1A73E8' },
    modal: { ondismiss: () => onFailure('CANCELLED') },
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      onSuccess({
        success: true,
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
    },
  };
}

export async function initiatePayment(_config: PaymentConfig): Promise<PaymentResult> {
  console.warn('[paymentService] initiatePayment() called — migrate caller to paymentsApi.initiate()');
  return { success: false, error: 'Use paymentsApi.initiate() from src/api/services/payments.ts' };
}

export async function verifyPayment(
  _paymentId: string,
  _orderId: string,
  _signature: string
): Promise<{ verified: boolean; error?: string }> {
  console.warn('[paymentService] verifyPayment() called — migrate caller to paymentsApi.verify()');
  return { verified: false, error: 'Use paymentsApi.verify() from src/api/services/payments.ts' };
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  console.warn('[paymentService] getPaymentStatus() stub');
  return {
    paymentId,
    status: 'pending',
    amount: PRODUCT_PRICE * 100,
    currency: PRODUCT_CURRENCY,
  };
}
