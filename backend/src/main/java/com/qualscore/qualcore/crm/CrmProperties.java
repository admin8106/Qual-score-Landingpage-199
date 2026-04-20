package com.qualscore.qualcore.crm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for CRM integration.
 *
 * All properties are bound from the {@code integrations.crm.*} namespace.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Webhook provider environment variables:
 * ─────────────────────────────────────────────────────────────────────────
 *   CRM_PROVIDER            — "webhook" | "stub" (default)
 *   CRM_WEBHOOK_URL         — Full HTTPS URL of the receiving endpoint
 *   CRM_WEBHOOK_SECRET      — Value sent as Authorization: Bearer <secret>
 *                             or X-CRM-Secret: <secret> header
 *   CRM_WEBHOOK_AUTH_HEADER — Header name to use (default: "Authorization")
 *   CRM_WEBHOOK_AUTH_PREFIX — Value prefix (default: "Bearer ")
 *   CRM_TIMEOUT_SECONDS     — HTTP read timeout (default: 10)
 *   CRM_MAX_RETRIES         — Retry count on transient failure (default: 2)
 *   CRM_ENABLED             — Master on/off switch (default: true)
 *
 * Legacy / HubSpot / Zoho specific keys (leave blank until native SDK added):
 *   CRM_API_KEY, CRM_API_URL, CRM_OWNER_ID
 */
@Component
@ConfigurationProperties(prefix = "integrations.crm")
public class CrmProperties {

    private String provider = "stub";
    private boolean enabled = true;
    private String apiKey;
    private String apiUrl;
    private String ownerId;

    private String webhookUrl;
    private String webhookSecret;
    private String webhookAuthHeader = "Authorization";
    private String webhookAuthPrefix = "Bearer ";

    private int timeoutSeconds = 10;
    private int maxRetries = 2;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public String getWebhookAuthHeader() { return webhookAuthHeader; }
    public void setWebhookAuthHeader(String webhookAuthHeader) { this.webhookAuthHeader = webhookAuthHeader; }

    public String getWebhookAuthPrefix() { return webhookAuthPrefix; }
    public void setWebhookAuthPrefix(String webhookAuthPrefix) { this.webhookAuthPrefix = webhookAuthPrefix; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public boolean isWebhookConfigured() {
        return webhookUrl != null && !webhookUrl.isBlank();
    }
}
