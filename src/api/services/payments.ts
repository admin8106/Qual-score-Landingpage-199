/**
 * Payment service — wraps /api/v1/payments endpoints.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PROVIDER-AWARE FLOW
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. Call paymentsApi.initiate() — creates the gateway order server-side
 *    and returns provider-specific checkout params.
 *
 * 2. Branch on checkoutType from the response:
 *
 *    RAZORPAY_MODAL
 *      Load checkout.js, open Razorpay modal with { key, order_id, amount }.
 *      On success callback: call paymentsApi.verify() with the callback params.
 *
 *    PAYU_FORM
 *      Build a form POST to payuData.baseUrl/_payment with payuData fields.
 *      On PayU redirect to surl: extract params from URL/query string.
 *      Call paymentsApi.verify() with txnid, mihpayid, hash, signaturePayload.
 *      signaturePayload = "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
 *
 *    MOCK
 *      Skip gateway entirely. Call paymentsApi.verify() directly
 *      with synthetic params (backend skips signature check in mock mode).
 *
 * 3. Store paymentReference from verify response — required for candidate
 *    profile creation and throughout the rest of the funnel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BACKEND IS ALWAYS THE SOURCE OF TRUTH
 * ─────────────────────────────────────────────────────────────────────────
 * Never treat the gateway callback alone as success. Payment is confirmed
 * only after paymentsApi.verify() returns { verified: true }.
 */

import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';
import { opFlags } from '../../utils/opFlags';

export interface InitiatePaymentRequest {
  candidateName?: string;
  email?: string;
  mobileNumber?: string;
  amountPaise: number;
}

/**
 * PayU-specific checkout params returned when checkoutType = "PAYU_FORM".
 *
 * Build a form POST:
 *   <form method="POST" action="{baseUrl}/_payment">
 *     <input type="hidden" name="txnid"       value="{txnid}" />
 *     <input type="hidden" name="key"         value="{key}" />
 *     <input type="hidden" name="amount"      value="{amount}" />
 *     <input type="hidden" name="productinfo" value="{productinfo}" />
 *     <input type="hidden" name="firstname"   value="{firstname}" />
 *     <input type="hidden" name="email"       value="{email}" />
 *     <input type="hidden" name="hash"        value="{hash}" />
 *     <input type="hidden" name="surl"        value="https://app.qualscore.in/payment/return?ref={paymentReference}" />
 *     <input type="hidden" name="furl"        value="https://app.qualscore.in/payment/failed" />
 *     <input type="hidden" name="udf1"        value="" />
 *     ...udf2-udf5 similarly...
 *   </form>
 *
 * On PayU redirect to surl, extract from query params:
 *   txnid, mihpayid, status, amount, productinfo, firstname, email,
 *   udf1, udf2, udf3, udf4, udf5, hash, key
 *
 * Build signaturePayload for /verify:
 *   `${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`
 */
export interface PayUOrderData {
  txnid: string;
  key: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  hash: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  baseUrl: string;
}

/**
 * checkoutType determines which payment UI to render:
 *
 *   RAZORPAY_MODAL — open Razorpay JS checkout widget
 *   PAYU_FORM      — build and POST an HTML form to PayU hosted page
 *   MOCK           — simulate payment immediately (dev/test only)
 */
export type CheckoutType = 'RAZORPAY_MODAL' | 'PAYU_FORM' | 'MOCK';

export interface InitiatePaymentResponse {
  paymentReference: string;
  gatewayOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  provider: string;
  checkoutType: CheckoutType;
  payuData?: PayUOrderData;
}

/**
 * Verify request — fields differ by provider:
 *
 * RAZORPAY:
 *   gatewayOrderId   = razorpay_order_id   (from JS callback)
 *   gatewayPaymentId = razorpay_payment_id  (from JS callback)
 *   gatewaySignature = razorpay_signature   (from JS callback)
 *   signaturePayload = not needed (backend constructs "orderId|paymentId")
 *
 * PAYU:
 *   gatewayOrderId   = txnid       (from PayU redirect params)
 *   gatewayPaymentId = mihpayid    (from PayU redirect params)
 *   gatewaySignature = hash        (from PayU redirect params)
 *   signaturePayload = REQUIRED — pipe string:
 *     "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
 *
 * MOCK:
 *   Any non-blank values — backend skips all verification.
 */
export interface VerifyPaymentRequest {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  signaturePayload?: string;
  paymentReference?: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  paymentReference: string;
  status: string;
}

export interface PaymentStatusResponse {
  paymentReference: string;
  status: 'INITIATED' | 'VERIFIED' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  verified: boolean;
  gatewayOrderId?: string;
  verifiedAt?: string;
}

const BASE = '/api/v1/payments';

export const paymentsApi = {
  async initiate(request: InitiatePaymentRequest): Promise<ApiResult<InitiatePaymentResponse>> {
    if (opFlags.mockPayment) {
      const { mockInitiatePayment } = await import('./mockBackend');
      return mockInitiatePayment(request.amountPaise);
    }
    return httpClient.post<InitiatePaymentResponse>(`${BASE}/initiate`, request);
  },

  async verify(request: VerifyPaymentRequest): Promise<ApiResult<VerifyPaymentResponse>> {
    if (opFlags.mockPayment) {
      const { mockVerifyPayment } = await import('./mockBackend');
      return mockVerifyPayment(
        request.gatewayOrderId,
        request.gatewayPaymentId,
        request.gatewaySignature,
        request.paymentReference,
      );
    }
    return httpClient.post<VerifyPaymentResponse>(`${BASE}/verify`, request);
  },

  async getStatus(paymentReference: string): Promise<ApiResult<PaymentStatusResponse>> {
    if (opFlags.mockPayment) {
      const { mockGetPaymentStatus } = await import('./mockBackend');
      return mockGetPaymentStatus(paymentReference);
    }
    return httpClient.getWithRetry<PaymentStatusResponse>(`${BASE}/status/${encodeURIComponent(paymentReference)}`);
  },
};

/**
 * Submits a PayU form POST to PayU's hosted checkout page.
 *
 * Builds a hidden form with all payuData fields plus surl/furl,
 * appends it to the document body, and submits it — causing a full-page
 * redirect to PayU's hosted checkout.
 *
 * surl: URL PayU redirects to after successful payment (include paymentReference)
 * furl: URL PayU redirects to after payment failure or cancellation
 *
 * IMPORTANT: The page will navigate away. Any unsaved state will be lost.
 * Store paymentReference in sessionStorage before calling this.
 */
export function submitPayUForm(payuData: PayUOrderData, surl: string, furl: string): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${payuData.baseUrl}/_payment`;

  const fields: Record<string, string> = {
    txnid: payuData.txnid,
    key: payuData.key,
    amount: payuData.amount,
    productinfo: payuData.productinfo,
    firstname: payuData.firstname,
    email: payuData.email,
    hash: payuData.hash,
    udf1: payuData.udf1,
    udf2: payuData.udf2,
    udf3: payuData.udf3,
    udf4: payuData.udf4,
    udf5: payuData.udf5,
    surl,
    furl,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

/**
 * Builds the signaturePayload string for PayU /verify calls.
 *
 * Call this on the PayU return page, after extracting params from the
 * redirect URL (query string or POST body depending on surl method).
 *
 * Pipe order (must exactly match PayU's reverse hash formula):
 *   status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
export function buildPayUSignaturePayload(params: {
  status: string;
  udf5: string;
  udf4: string;
  udf3: string;
  udf2: string;
  udf1: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
}): string {
  return [
    params.status,
    params.udf5,
    params.udf4,
    params.udf3,
    params.udf2,
    params.udf1,
    params.email,
    params.firstname,
    params.productinfo,
    params.amount,
    params.txnid,
    params.key,
  ].join('|');
}
