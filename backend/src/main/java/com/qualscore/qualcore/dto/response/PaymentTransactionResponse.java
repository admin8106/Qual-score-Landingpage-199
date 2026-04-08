package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class PaymentTransactionResponse {

    private UUID id;
    private String paymentReference;
    private String gatewayOrderId;
    private String gatewayPaymentId;
    private Integer amountPaise;
    private String currency;
    private PaymentTransactionStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
