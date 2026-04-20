package com.qualscore.qualcore.payment;

/**
 * PayU-specific checkout parameters returned to the frontend.
 *
 * These are all the fields the frontend needs to build the form POST
 * to PayU's hosted checkout URL. The hash is pre-computed server-side
 * to keep the merchant salt secret.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FRONTEND USAGE
 * ─────────────────────────────────────────────────────────────────────────
 *   const form = document.createElement('form');
 *   form.method = 'POST';
 *   form.action = payuData.baseUrl + '/_payment';
 *   Object.entries(payuData).forEach(([k, v]) => {
 *     if (k === 'baseUrl') return;
 *     const input = document.createElement('input');
 *     input.type = 'hidden';
 *     input.name = k;
 *     input.value = v;
 *     form.appendChild(input);
 *   });
 *   document.body.appendChild(form);
 *   form.submit();
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SURL / FURL
 * ─────────────────────────────────────────────────────────────────────────
 * These must be set by the frontend (or injected by the backend).
 * Typically: https://app.qualscore.in/payment/return?ref={paymentReference}
 * The frontend return page extracts the redirect params and calls /verify.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FIELD MAPPING TO PAYU'S HASH
 * ─────────────────────────────────────────────────────────────────────────
 * Forward: SHA-512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 * Reverse: SHA-512(salt|status|||||||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
public record PayUOrderData(
        String txnid,
        String key,
        String amount,
        String productinfo,
        String firstname,
        String email,
        String hash,
        String udf1,
        String udf2,
        String udf3,
        String udf4,
        String udf5,
        String baseUrl
) {}
