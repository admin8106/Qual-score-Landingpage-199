package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import lombok.Builder;
import lombok.Data;

/**
 * Lightweight payment status response.
 *
 * Used by the frontend recovery flow (GET /api/v1/payments/status/{paymentReference})
 * to determine whether a payment has been confirmed server-side without re-triggering
 * the full /verify round-trip.
 *
 * verified = true  → payment is in VERIFIED or SUCCESS state; frontend can proceed
 * verified = false → payment is INITIATED, FAILED, or not found
 * status   → exact DB status for frontend state-machine routing
 */
@Data
@Builder
public class PaymentStatusResponse {

    /** Internal reference (PAY-xxx) identifying this payment. */
    private String paymentReference;

    /** true only if status is VERIFIED or SUCCESS */
    private boolean verified;

    /** Raw enum name: INITIATED, VERIFIED, SUCCESS, FAILED, UNKNOWN */
    private String status;

    /** Gateway order ID — may be needed by frontend to re-attempt /verify */
    private String gatewayOrderId;

    /** Timestamp of verification, if available */
    private String verifiedAt;
}
