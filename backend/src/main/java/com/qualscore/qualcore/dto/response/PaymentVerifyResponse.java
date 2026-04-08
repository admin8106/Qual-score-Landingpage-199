package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentVerifyResponse {
    private boolean verified;
    private String paymentReference;
    private String gatewayOrderId;
    private String gatewayPaymentId;
    private PaymentTransactionStatus status;
    private String verifiedAt;
}
