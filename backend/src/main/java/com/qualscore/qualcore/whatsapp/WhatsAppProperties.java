package com.qualscore.qualcore.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for WhatsApp integration.
 *
 * All properties are bound from the {@code integrations.whatsapp.*} namespace.
 *
 * Required environment variables for Meta Cloud API:
 *   WHATSAPP_ACCESS_TOKEN    — Permanent or system-user access token from Meta Business Manager
 *   WHATSAPP_PHONE_NUMBER_ID — Numeric Phone Number ID from Meta → WhatsApp → API Setup
 *   WHATSAPP_BUSINESS_ACCOUNT_ID — Meta Business Account ID (used for webhook verification)
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — A secret string you choose; set the same value in Meta webhook config
 *
 * Optional:
 *   WHATSAPP_PROVIDER  — "meta" (default) | "stub"
 *   WHATSAPP_API_VERSION — Graph API version, e.g. "v19.0" (default)
 *   WHATSAPP_TIMEOUT_SECONDS — HTTP read timeout (default 15)
 *   WHATSAPP_MAX_RETRIES — retry attempts on transient failures (default 2)
 */
@Component
@ConfigurationProperties(prefix = "integrations.whatsapp")
public class WhatsAppProperties {

    private String provider = "stub";
    private String accessToken;
    private String phoneNumberId;
    private String businessAccountId;
    private String webhookVerifyToken;
    private String apiVersion = "v19.0";
    private int timeoutSeconds = 15;
    private int maxRetries = 2;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getPhoneNumberId() { return phoneNumberId; }
    public void setPhoneNumberId(String phoneNumberId) { this.phoneNumberId = phoneNumberId; }

    public String getBusinessAccountId() { return businessAccountId; }
    public void setBusinessAccountId(String businessAccountId) { this.businessAccountId = businessAccountId; }

    public String getWebhookVerifyToken() { return webhookVerifyToken; }
    public void setWebhookVerifyToken(String webhookVerifyToken) { this.webhookVerifyToken = webhookVerifyToken; }

    public String getApiVersion() { return apiVersion; }
    public void setApiVersion(String apiVersion) { this.apiVersion = apiVersion; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public boolean isConfigured() {
        return accessToken != null && !accessToken.isBlank()
                && phoneNumberId != null && !phoneNumberId.isBlank();
    }
}
