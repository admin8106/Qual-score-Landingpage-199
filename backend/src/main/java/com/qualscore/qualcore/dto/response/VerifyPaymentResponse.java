package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerifyPaymentResponse {
    private boolean verified;
    private String paymentId;
    private String orderId;
    private String capturedAt;
}
