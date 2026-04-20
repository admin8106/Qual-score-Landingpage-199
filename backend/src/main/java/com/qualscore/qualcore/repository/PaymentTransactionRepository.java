package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByPaymentReference(String paymentReference);

    Optional<PaymentTransaction> findByGatewayOrderId(String gatewayOrderId);

    Optional<PaymentTransaction> findByGatewayPaymentId(String gatewayPaymentId);

    List<PaymentTransaction> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    Page<PaymentTransaction> findByStatusOrderByCreatedAtDesc(PaymentTransactionStatus status, Pageable pageable);

    boolean existsByPaymentReference(String paymentReference);

    /**
     * Idempotency check for webhook processing.
     * A webhook event ID that already exists in the table means the event was already handled.
     */
    boolean existsByWebhookEventId(String webhookEventId);

    long countByStatus(PaymentTransactionStatus status);
}
