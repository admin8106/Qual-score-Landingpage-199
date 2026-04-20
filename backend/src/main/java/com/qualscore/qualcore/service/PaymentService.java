package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.InitiatePaymentRequest;
import com.qualscore.qualcore.dto.request.VerifyPaymentRequest;
import com.qualscore.qualcore.dto.response.InitiatePaymentResponse;
import com.qualscore.qualcore.dto.response.VerifyPaymentResponse;

public interface PaymentService {

    InitiatePaymentResponse initiatePayment(InitiatePaymentRequest request);

    VerifyPaymentResponse verifyPayment(VerifyPaymentRequest request);
}
