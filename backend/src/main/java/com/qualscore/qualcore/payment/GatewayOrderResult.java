package com.qualscore.qualcore.payment;

/**
 * Result of a gateway order creation.
 *
 * gatewayOrderId  — the provider-assigned order/transaction ID sent to the frontend
 * rawResponse     — full JSON response from the gateway (stored verbatim for audit)
 */
public record GatewayOrderResult(
        String gatewayOrderId,
        String rawResponse
) {}
