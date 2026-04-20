package com.qualscore.qualcore.payment;

/**
 * Describes which checkout UI the frontend should render after receiving
 * a successful /initiate response.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RAZORPAY_MODAL
 *   Razorpay's JavaScript checkout widget opens as an in-page modal.
 *   Frontend loads checkout.js from checkout.razorpay.com, then calls:
 *     new Razorpay({ key, order_id, amount, currency, ... }).open()
 *   Payment result is delivered via a JS callback (handler function).
 *   No page redirect is involved.
 *
 * PAYU_FORM
 *   PayU's hosted payment page requires a browser form POST.
 *   Frontend builds a <form method="POST" action="{payuData.baseUrl}/_payment">
 *   with all payuData fields as hidden inputs, then submits the form.
 *   After payment, PayU redirects the browser to surl (success) or furl (failure).
 *   The frontend return page must then call /verify with the redirect params.
 *
 * MOCK
 *   No real gateway — the payment is simulated immediately.
 *   Used in development/test when no gateway credentials are configured.
 *   Frontend skips the checkout widget entirely and calls /verify directly.
 * ─────────────────────────────────────────────────────────────────────────
 */
public enum CheckoutType {
    RAZORPAY_MODAL,
    PAYU_FORM,
    MOCK
}
