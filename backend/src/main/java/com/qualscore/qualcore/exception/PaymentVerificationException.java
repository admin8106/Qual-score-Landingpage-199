package com.qualscore.qualcore.exception;

import org.springframework.http.HttpStatus;

public class PaymentVerificationException extends BusinessException {

    public PaymentVerificationException(String message) {
        super("PAYMENT_VERIFICATION_FAILED", message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
