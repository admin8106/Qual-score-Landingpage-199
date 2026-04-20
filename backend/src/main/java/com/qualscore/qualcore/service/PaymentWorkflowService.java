package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.PaymentInitiateRequest;
import com.qualscore.qualcore.dto.request.PaymentVerifyRequest;
import com.qualscore.qualcore.dto.response.PaymentInitiateResponse;
import com.qualscore.qualcore.dto.response.PaymentStatusResponse;
import com.qualscore.qualcore.dto.response.PaymentVerifyResponse;

public interface PaymentWorkflowService {

    PaymentInitiateResponse initiate(PaymentInitiateRequest request);

    PaymentVerifyResponse verify(PaymentVerifyRequest request);

    PaymentStatusResponse getStatus(String paymentReference);
}
