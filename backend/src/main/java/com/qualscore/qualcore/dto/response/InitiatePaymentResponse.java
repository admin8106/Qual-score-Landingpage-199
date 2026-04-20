package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InitiatePaymentResponse {
    private String orderId;
    private Long amount;
    private String currency;
    private String keyId;
}
