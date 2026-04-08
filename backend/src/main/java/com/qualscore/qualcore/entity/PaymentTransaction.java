package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "payment_transactions",
        indexes = {
                @Index(name = "idx_pt_payment_reference",  columnList = "payment_reference",  unique = true),
                @Index(name = "idx_pt_gateway_order_id",   columnList = "gateway_order_id"),
                @Index(name = "idx_pt_gateway_payment_id", columnList = "gateway_payment_id"),
                @Index(name = "idx_pt_webhook_event_id",   columnList = "webhook_event_id",   unique = true),
                @Index(name = "idx_pt_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_pt_status",             columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Internal reference generated at initiation time (e.g. PAY-AB12CD34...).
     * Returned to the frontend; used to link the verified payment to a candidate profile.
     */
    @Column(name = "payment_reference", nullable = false, unique = true, length = 60)
    private String paymentReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id")
    private CandidateProfile candidateProfile;

    /**
     * Gateway identifier: "RAZORPAY", "PAYU", "MOCK"
     * Stored to enable multi-gateway audit queries.
     */
    @Column(name = "gateway_name", nullable = false, length = 40)
    private String gatewayName;

    /**
     * Payment amount in the unit of the currency (e.g. INR, not paise).
     * Source of truth for financial reporting.
     */
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 5)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PaymentTransactionStatus status = PaymentTransactionStatus.INITIATED;

    /**
     * Gateway-assigned order ID (e.g. order_xxx for Razorpay, txnid for PayU).
     * Used to look up the transaction on webhook events and verification calls.
     */
    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    /**
     * Gateway-assigned payment ID issued after the user completes payment.
     * Populated during /verify or via webhook (whichever arrives first).
     */
    @Column(name = "gateway_payment_id", length = 100)
    private String gatewayPaymentId;

    /**
     * Cryptographic signature returned by the gateway with the payment callback.
     * Retained for audit purposes after verification succeeds.
     */
    @Column(name = "gateway_signature", length = 512)
    private String gatewaySignature;

    /**
     * Unique event ID sent by the gateway in the webhook header (e.g. X-Razorpay-Event-Id).
     * Used as the idempotency key — if already present, the webhook is a duplicate and ignored.
     * UNIQUE constraint prevents concurrent duplicate processing at the DB level.
     */
    @Column(name = "webhook_event_id", length = 120, unique = true)
    private String webhookEventId;

    /**
     * Timestamp set when payment status transitions to VERIFIED.
     * Used for SLA tracking and downstream gating (analysis flow blocked until this is set).
     */
    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    /**
     * Full raw body of the latest webhook or callback payload.
     * Stored verbatim for replay, debugging, and compliance audit.
     */
    @Column(name = "raw_payload", columnDefinition = "text")
    private String rawPayload;

    /**
     * Raw response from the gateway's order creation API.
     * Retained for debugging order creation failures.
     */
    @Column(name = "gateway_order_raw_response", columnDefinition = "text")
    private String gatewayOrderRawResponse;

    /**
     * Returns true only if the payment has been cryptographically verified
     * (by /verify endpoint or webhook — whichever lands first).
     *
     * The analysis flow MUST check this before proceeding.
     */
    public boolean isVerified() {
        return status == PaymentTransactionStatus.VERIFIED || status == PaymentTransactionStatus.SUCCESS;
    }

    /**
     * Returns true if the transaction is in a terminal failure state.
     * Terminal failed payments must not be retried — a new initiation is required.
     */
    public boolean isFailed() {
        return status == PaymentTransactionStatus.FAILED;
    }
}
