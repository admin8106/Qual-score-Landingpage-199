package com.qualscore.qualcore.payment;

/**
 * Thrown by {@link PaymentGatewayClient} implementations when an unrecoverable
 * gateway error occurs (network failure, invalid config, unexpected HTTP status).
 *
 * Callers must NOT catch this to silently swallow errors — propagate it so the
 * GlobalExceptionHandler maps it to HTTP 502.
 */
public class PaymentGatewayException extends RuntimeException {

    private final String gateway;

    public PaymentGatewayException(String gateway, String message) {
        super("[" + gateway + "] " + message);
        this.gateway = gateway;
    }

    public PaymentGatewayException(String gateway, String message, Throwable cause) {
        super("[" + gateway + "] " + message, cause);
        this.gateway = gateway;
    }

    public String getGateway() {
        return gateway;
    }
}
