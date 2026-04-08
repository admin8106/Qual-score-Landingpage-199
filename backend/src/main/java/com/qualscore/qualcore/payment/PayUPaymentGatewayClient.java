package com.qualscore.qualcore.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

/**
 * PayU Money gateway client (India).
 *
 * Active when: integrations.payment.provider=payu
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FUNDAMENTAL DIFFERENCE FROM RAZORPAY
 * ─────────────────────────────────────────────────────────────────────────
 * Razorpay: server creates an order → returns orderId → frontend opens JS modal.
 * PayU:     server computes a hash → returns all params → frontend POSTs a
 *           HTML form directly to PayU's hosted checkout URL.
 *           There is NO server-side order creation step.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HASH ALGORITHM (PayU Forward Hash — checkout initiation)
 * ─────────────────────────────────────────────────────────────────────────
 *   SHA-512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 *
 *   key         = merchant key (from dashboard)
 *   txnid       = unique transaction ID (= internalReference / paymentReference)
 *   amount      = decimal string with 2 places, e.g. "199.00" (NOT paise)
 *   productinfo = product description string
 *   firstname   = customer's first name (can be empty string)
 *   email       = customer email (can be empty string)
 *   udf1–udf5   = user-defined fields (empty strings if unused)
 *   salt        = merchant salt (secret — NEVER send to frontend)
 *
 *   The frontend MUST NOT re-compute or modify the hash.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REVERSE HASH (PayU return redirect + webhook verification)
 * ─────────────────────────────────────────────────────────────────────────
 *   SHA-512(salt|status|||||||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 *   Fields are in REVERSE order from the forward hash. 'status' is PayU's
 *   payment status (e.g. "success"). Idempotency key = mihpayid.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WEBHOOK DIFFERENCES FROM RAZORPAY
 * ─────────────────────────────────────────────────────────────────────────
 * PayU sends: application/x-www-form-urlencoded POST (NOT JSON).
 * No X-Signature header — the hash is a field inside the POST body.
 * Verification = re-compute reverse hash and compare with body's 'hash' param.
 * Idempotency key = mihpayid (PayU's unique payment identifier).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FRONTEND CHECKOUT FLOW (different from Razorpay)
 * ─────────────────────────────────────────────────────────────────────────
 *   1. Call POST /api/v1/payments/initiate
 *      Receive: checkoutType="PAYU_FORM" + payuData { key, txnid, amount,
 *               productinfo, firstname, email, hash, udf1-udf5, baseUrl }
 *
 *   2. Build a <form method="POST" action="{payuData.baseUrl}/_payment">
 *      with all payuData fields as hidden <input> elements.
 *
 *   3. Submit the form — user is redirected to PayU's hosted payment page.
 *
 *   4. After payment, PayU redirects back to surl (success) or furl (failure).
 *      The redirect includes: txnid, mihpayid, status, amount, hash, etc.
 *
 *   5. Frontend on return page calls POST /api/v1/payments/verify with:
 *        gatewayOrderId   = txnid
 *        gatewayPaymentId = mihpayid
 *        gatewaySignature = hash
 *        signaturePayload = "status|udf5|udf4|udf3|udf2|udf1|email|
 *                            firstname|productinfo|amount|txnid|key"
 *        (reconstruct this string from PayU's redirect params)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REQUIRED ENVIRONMENT VARIABLES
 * ─────────────────────────────────────────────────────────────────────────
 *   PAYU_MERCHANT_KEY    = merchant key from PayU dashboard
 *   PAYU_MERCHANT_SALT   = merchant salt (NEVER expose to frontend)
 *   PAYU_BASE_URL        = https://secure.payu.in  (live)
 *                          https://test.payu.in    (sandbox / test)
 *   INTEGRATIONS_PAYMENT_PROVIDER=payu
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DASHBOARD SETUP
 * ─────────────────────────────────────────────────────────────────────────
 *   1. PayU Dashboard → My Account → Merchant key & Salt
 *   2. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT.
 *   3. Set success/failure URLs to your frontend return page.
 *   4. Configure Payment Notification URL:
 *        https://api.qualscore.in/api/v1/payments/webhook
 */
@Slf4j
@Component("payuPaymentGatewayClient")
@Qualifier("payuPaymentGatewayClient")
public class PayUPaymentGatewayClient implements PaymentGatewayClient {

    @Value("${integrations.payu.merchant-key:}")
    private String merchantKey;

    @Value("${integrations.payu.merchant-salt:}")
    private String merchantSalt;

    @Value("${integrations.payu.base-url:https://test.payu.in}")
    private String baseUrl;

    static PayUPaymentGatewayClient withCredentials(String merchantKey, String merchantSalt, String baseUrl) {
        PayUPaymentGatewayClient client = new PayUPaymentGatewayClient();
        client.merchantKey = merchantKey != null ? merchantKey : "";
        client.merchantSalt = merchantSalt != null ? merchantSalt : "";
        client.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl : "https://test.payu.in";
        return client;
    }

    @Override
    public String gatewayName() {
        return "PAYU";
    }

    /**
     * PayU does NOT use server-side order creation.
     *
     * Computes the forward hash and packages all params needed for the
     * frontend to POST a checkout form directly to PayU.
     *
     * Returns:
     *   gatewayOrderId = txnid (= internalReference, used as PayU's transaction ID)
     *   rawResponse    = JSON with all checkout form fields + hash + baseUrl
     */
    @Override
    public GatewayOrderResult createOrder(CreateOrderRequest request) {
        if (merchantKey == null || merchantKey.isBlank()
                || merchantSalt == null || merchantSalt.isBlank()) {
            log.warn("[PayU] Merchant key or salt not configured — returning stub checkout params. ref={}",
                    request.internalReference());
            return createStubOrder(request);
        }

        String txnId = request.internalReference();
        String amount = toDecimalAmount(request.amountPaise());
        String productInfo = request.productDescription() != null
                ? request.productDescription()
                : "QualScore Employability Diagnostic";
        String firstName = nullSafe(request.candidateName());
        String email = nullSafe(request.candidateEmail());

        String hash = computeForwardHash(txnId, amount, productInfo, firstName, email);
        String rawResponse = buildCheckoutParamsJson(txnId, amount, productInfo, firstName, email, hash);

        log.info("[PayU] Checkout params prepared: txnId={} amount={}", txnId, amount);
        return new GatewayOrderResult(txnId, rawResponse);
    }

    /**
     * Verifies PayU's callback signature on the return redirect.
     *
     * signaturePayload (pre-built by PaymentWorkflowServiceImpl):
     *   "status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
     *
     * We prepend the salt and compute SHA-512:
     *   computed = SHA-512(salt | signaturePayload)
     *   compare  with gatewaySignature (the 'hash' param from PayU redirect)
     */
    @Override
    public boolean verifySignature(SignatureVerificationRequest request) {
        if (merchantSalt == null || merchantSalt.isBlank()) {
            log.warn("[PayU] Merchant salt not configured — signature verification skipped");
            return true;
        }
        if (request.gatewaySignature() == null || request.gatewaySignature().isBlank()) {
            log.warn("[PayU] Missing hash in verification request: txnid={}", request.gatewayOrderId());
            return false;
        }
        if (request.signaturePayload() == null || request.signaturePayload().isBlank()) {
            log.warn("[PayU] Missing signaturePayload in verification request: txnid={}", request.gatewayOrderId());
            return false;
        }
        String computed = sha512(merchantSalt + "|" + request.signaturePayload());
        boolean valid = computed.equals(request.gatewaySignature().toLowerCase());
        if (!valid) {
            log.warn("[PayU] Reverse hash mismatch: txnid={}", request.gatewayOrderId());
        }
        return valid;
    }

    /**
     * Verifies PayU's Payment Notification (webhook).
     *
     * PayU sends application/x-www-form-urlencoded POST — not JSON.
     * signatureHeader is NOT used (hash is a field inside the body).
     *
     * Extracts all relevant fields from the form body, recomputes the
     * reverse hash, and compares with the 'hash' param.
     */
    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        if (merchantSalt == null || merchantSalt.isBlank()) {
            log.warn("[PayU] Merchant salt not configured — webhook signature verification skipped");
            return true;
        }

        try {
            String body = new String(rawPayload, StandardCharsets.UTF_8);
            Map<String, String> params = parseFormBody(body);

            String status = params.getOrDefault("status", "");
            String txnId = params.getOrDefault("txnid", "");
            String amount = params.getOrDefault("amount", "");
            String productInfo = params.getOrDefault("productinfo", "");
            String firstName = params.getOrDefault("firstname", "");
            String email = params.getOrDefault("email", "");
            String udf1 = params.getOrDefault("udf1", "");
            String udf2 = params.getOrDefault("udf2", "");
            String udf3 = params.getOrDefault("udf3", "");
            String udf4 = params.getOrDefault("udf4", "");
            String udf5 = params.getOrDefault("udf5", "");
            String receivedHash = params.getOrDefault("hash", "");
            String key = params.getOrDefault("key", "");

            if (txnId.isBlank() || receivedHash.isBlank()) {
                log.warn("[PayU] Webhook missing txnid or hash in form body");
                return false;
            }

            String reversePayload = merchantSalt + "|" + status
                    + "|" + udf5 + "|" + udf4 + "|" + udf3 + "|" + udf2 + "|" + udf1
                    + "|" + email + "|" + firstName + "|" + productInfo
                    + "|" + amount + "|" + txnId + "|" + key;

            String computed = sha512(reversePayload);
            boolean valid = computed.equals(receivedHash.toLowerCase());
            if (!valid) {
                log.warn("[PayU] Webhook reverse hash mismatch: txnid={}", txnId);
            }
            return valid;

        } catch (Exception e) {
            log.error("[PayU] Webhook signature verification failed", e);
            return false;
        }
    }

    @Override
    public String publicKey() {
        return merchantKey != null && !merchantKey.isBlank() ? merchantKey : "";
    }

    private String computeForwardHash(String txnId, String amount, String productInfo,
                                       String firstName, String email) {
        String hashString = merchantKey + "|" + txnId + "|" + amount + "|" + productInfo
                + "|" + firstName + "|" + email + "|||||||||||" + merchantSalt;
        return sha512(hashString);
    }

    private String buildCheckoutParamsJson(String txnId, String amount, String productInfo,
                                            String firstName, String email, String hash) {
        return ("{\"txnid\":\"%s\",\"key\":\"%s\",\"amount\":\"%s\","
                + "\"productinfo\":\"%s\",\"firstname\":\"%s\",\"email\":\"%s\","
                + "\"hash\":\"%s\",\"udf1\":\"\",\"udf2\":\"\",\"udf3\":\"\","
                + "\"udf4\":\"\",\"udf5\":\"\",\"baseUrl\":\"%s\"}")
                .formatted(txnId, merchantKey, amount, productInfo, firstName, email, hash, baseUrl);
    }

    private GatewayOrderResult createStubOrder(CreateOrderRequest request) {
        String txnId = request.internalReference();
        String amount = toDecimalAmount(request.amountPaise());
        String stubHash = "stub_hash_set_PAYU_MERCHANT_KEY_and_PAYU_MERCHANT_SALT_env_vars";
        String raw = buildCheckoutParamsJson(txnId, amount,
                nullSafe(request.productDescription()),
                nullSafe(request.candidateName()),
                nullSafe(request.candidateEmail()),
                stubHash);
        log.warn("[PayU] STUB checkout params returned (credentials not configured): txnId={}", txnId);
        return new GatewayOrderResult(txnId, raw);
    }

    private Map<String, String> parseFormBody(String body) {
        Map<String, String> params = new HashMap<>();
        if (body == null || body.isBlank()) return params;
        for (String part : body.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                try {
                    params.put(
                            URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                            URLDecoder.decode(kv[1], StandardCharsets.UTF_8)
                    );
                } catch (Exception ignored) {
                    params.put(kv[0], kv[1]);
                }
            } else if (kv.length == 1) {
                params.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), "");
            }
        }
        return params;
    }

    private String toDecimalAmount(Integer amountPaise) {
        return BigDecimal.valueOf(amountPaise)
                .movePointLeft(2)
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString();
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }

    private String sha512(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-512");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            log.error("[PayU] SHA-512 computation failed", e);
            return "hash_error";
        }
    }
}
