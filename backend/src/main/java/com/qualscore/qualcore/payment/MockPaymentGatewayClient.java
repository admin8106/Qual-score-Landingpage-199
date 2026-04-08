package com.qualscore.qualcore.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * In-process mock gateway client. Always registered as a Spring bean.
 * DynamicPaymentGatewayClient delegates to this when no DB config is active
 * or when provider_code=mock is configured.
 */
@Slf4j
@Component("mockPaymentGatewayClient")
@Qualifier("mockPaymentGatewayClient")
public class MockPaymentGatewayClient implements PaymentGatewayClient {

    @Override
    public String gatewayName() {
        return "MOCK";
    }

    @Override
    public GatewayOrderResult createOrder(CreateOrderRequest request) {
        String mockOrderId = "mock_order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String rawResponse = """
                {"id":"%s","amount":%d,"currency":"%s","status":"created","receipt":"%s"}
                """.formatted(mockOrderId, request.amountPaise(), request.currency(), request.internalReference()).strip();

        log.info("[MOCK Gateway] createOrder: ref={} amount={} orderId={}",
                request.internalReference(), request.amountPaise(), mockOrderId);

        return new GatewayOrderResult(mockOrderId, rawResponse);
    }

    @Override
    public boolean verifySignature(SignatureVerificationRequest request) {
        log.info("[MOCK Gateway] verifySignature: orderId={} paymentId={} — always PASS in mock mode",
                request.gatewayOrderId(), request.gatewayPaymentId());
        return true;
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        log.info("[MOCK Gateway] verifyWebhookSignature: length={}bytes header={} — always PASS in mock mode",
                rawPayload.length, signatureHeader);
        return true;
    }

    @Override
    public String publicKey() {
        return "key_mock_test";
    }
}
