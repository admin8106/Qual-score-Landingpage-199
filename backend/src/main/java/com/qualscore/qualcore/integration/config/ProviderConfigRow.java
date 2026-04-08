package com.qualscore.qualcore.integration.config;

import java.util.UUID;

public final class ProviderConfigRow {

    private ProviderConfigRow() {}

    public record AiConfigRow(
        UUID id,
        String providerCode,
        String providerName,
        String apiKeyEncrypted,
        String modelName,
        String baseUrl,
        double temperature,
        int maxTokens,
        int timeoutSeconds,
        int retryCount,
        boolean jsonStrictMode,
        boolean isPrimary,
        boolean isFallback,
        String environmentMode
    ) {}

    public record PaymentConfigRow(
        UUID id,
        String providerCode,
        String providerName,
        String environmentMode,
        boolean isPrimary,
        boolean isFallback,
        String razorpayKeyId,
        String razorpayKeySecret,
        String razorpayWebhookSecret,
        String payuMerchantKey,
        String payuSalt,
        String payuBaseUrl
    ) {}

    public record WhatsAppConfigRow(
        UUID id,
        String providerCode,
        String providerName,
        String environmentMode,
        boolean isPrimary,
        boolean isFallback,
        String metaAccessToken,
        String metaPhoneNumberId,
        String metaBusinessAccountId,
        String metaApiVersion,
        String metaWebhookVerifyToken
    ) {}

    public record EmailConfigRow(
        UUID id,
        String providerCode,
        String providerName,
        String environmentMode,
        boolean isPrimary,
        boolean isFallback,
        String senderEmail,
        String senderName,
        String replyToEmail,
        String resendApiKey,
        String sendgridApiKey,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String smtpPassword,
        boolean smtpUseTls
    ) {}

    public record CrmConfigRow(
        UUID id,
        String providerCode,
        String providerName,
        String environmentMode,
        boolean isPrimary,
        boolean isFallback,
        String baseUrl,
        String authToken,
        String mappingMode,
        boolean syncContact,
        boolean syncDeal,
        String customFieldMappings
    ) {}
}
