package com.qualscore.qualcore.payment;

import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.integration.config.ProviderConfigRow.PaymentConfigRow;
import com.qualscore.qualcore.integration.config.ProviderResolutionLogger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Dynamic payment gateway dispatcher.
 *
 * At call time, reads the active payment provider from ProviderConfigCache and
 * delegates to the appropriate concrete PaymentGatewayClient implementation.
 * When DB config supplies credentials, a fresh pre-configured instance is used
 * so credentials are always current without requiring a restart.
 *
 * Fallback order:
 *   1. DB config primary for current environment mode (with DB credentials)
 *   2. DB config fallback for current environment mode (with DB credentials)
 *   3. MockPaymentGatewayClient (env-var based — always registered)
 *
 * This bean is @Primary so all existing autowire points for PaymentGatewayClient
 * resolve to this dispatcher without any changes to the callers.
 */
@Slf4j
@Primary
@Component("dynamicPaymentGatewayClient")
public class DynamicPaymentGatewayClient implements PaymentGatewayClient {

    private final ProviderConfigCache configCache;
    private final ProviderResolutionLogger resolutionLogger;
    private final PaymentGatewayClient razorpayClient;
    private final PaymentGatewayClient payuClient;
    private final PaymentGatewayClient mockClient;

    public DynamicPaymentGatewayClient(
            ProviderConfigCache configCache,
            ProviderResolutionLogger resolutionLogger,
            @Qualifier("razorpayPaymentGatewayClient") PaymentGatewayClient razorpayClient,
            @Qualifier("payuPaymentGatewayClient") PaymentGatewayClient payuClient,
            @Qualifier("mockPaymentGatewayClient") PaymentGatewayClient mockClient) {
        this.configCache = configCache;
        this.resolutionLogger = resolutionLogger;
        this.razorpayClient = razorpayClient;
        this.payuClient = payuClient;
        this.mockClient = mockClient;
    }

    @Override
    public String gatewayName() {
        return resolveDelegate("GATEWAY_NAME", null).gatewayName();
    }

    @Override
    public GatewayOrderResult createOrder(CreateOrderRequest request) {
        return resolveDelegate("CREATE_ORDER", request.internalReference()).createOrder(request);
    }

    @Override
    public boolean verifySignature(SignatureVerificationRequest request) {
        return resolveDelegate("VERIFY_SIGNATURE", request.gatewayOrderId()).verifySignature(request);
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        return resolveDelegate("VERIFY_WEBHOOK", null).verifyWebhookSignature(rawPayload, signatureHeader);
    }

    @Override
    public String publicKey() {
        return resolveDelegate("PUBLIC_KEY", null).publicKey();
    }

    private PaymentGatewayClient resolveDelegate(String triggerContext, String callerRef) {
        Optional<PaymentConfigRow> configOpt = configCache.getActivePaymentConfig();

        if (configOpt.isEmpty()) {
            log.debug("[DynamicPayment] No DB config — using mock. context={}", triggerContext);
            resolutionLogger.logResolution("payment", configCache.getEnvironmentMode(),
                null, "mock", "MockPaymentGatewayClient",
                false, "NO_CONFIG", triggerContext, callerRef);
            return mockClient;
        }

        PaymentConfigRow config = configOpt.get();
        boolean wasFallback = config.isFallback();

        PaymentGatewayClient delegate = buildDelegate(config);

        log.debug("[DynamicPayment] Resolved to provider='{}' fallback={} env={} context={}",
            config.providerCode(), wasFallback, config.environmentMode(), triggerContext);

        resolutionLogger.logResolution("payment", config.environmentMode(),
            config.id(), config.providerCode(), config.providerName(),
            wasFallback, wasFallback ? "FALLBACK_USED" : "RESOLVED", triggerContext, callerRef);

        return delegate;
    }

    private PaymentGatewayClient buildDelegate(PaymentConfigRow config) {
        return switch (config.providerCode().toLowerCase()) {
            case "razorpay" -> {
                boolean hasDbCreds = config.razorpayKeyId() != null && !config.razorpayKeyId().isBlank()
                    && config.razorpayKeySecret() != null && !config.razorpayKeySecret().isBlank();
                if (hasDbCreds) {
                    log.info("[DynamicPayment] Using Razorpay with DB credentials (env={})", config.environmentMode());
                    yield RazorpayPaymentGatewayClient.withCredentials(
                        config.razorpayKeyId(),
                        config.razorpayKeySecret(),
                        config.razorpayWebhookSecret());
                }
                log.info("[DynamicPayment] Razorpay selected but no DB credentials — using env-var bean");
                yield razorpayClient;
            }
            case "payu" -> {
                boolean hasDbCreds = config.payuMerchantKey() != null && !config.payuMerchantKey().isBlank()
                    && config.payuSalt() != null && !config.payuSalt().isBlank();
                if (hasDbCreds) {
                    log.info("[DynamicPayment] Using PayU with DB credentials (env={})", config.environmentMode());
                    yield PayUPaymentGatewayClient.withCredentials(
                        config.payuMerchantKey(),
                        config.payuSalt(),
                        config.payuBaseUrl());
                }
                log.info("[DynamicPayment] PayU selected but no DB credentials — using env-var bean");
                yield payuClient;
            }
            case "mock" -> mockClient;
            default -> {
                log.warn("[DynamicPayment] Unknown providerCode='{}' — using mock", config.providerCode());
                yield mockClient;
            }
        };
    }
}
