package com.qualscore.qualcore.email;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for email integration.
 *
 * All properties are bound from the {@code integrations.email.*} and
 * {@code integrations.resend.*} namespaces.
 *
 * Required environment variables for Resend:
 *   RESEND_API_KEY       — API key from resend.com dashboard
 *   EMAIL_FROM_ADDRESS   — Verified sender address (e.g. reports@qualscore.in)
 *   EMAIL_FROM_NAME      — Display name in From header (e.g. QualScore)
 *
 * Optional:
 *   EMAIL_PROVIDER       — "resend" (default when key present) | "stub"
 *   EMAIL_REPLY_TO       — Reply-to address (defaults to from address)
 *   EMAIL_TIMEOUT_SECONDS — HTTP read timeout (default 15)
 */
@Component
@ConfigurationProperties(prefix = "integrations.email")
public class EmailProperties {

    private String provider = "stub";
    private String fromAddress = "reports@qualscore.in";
    private String fromName = "QualScore";
    private String replyTo;
    private String resendApiKey;
    private int timeoutSeconds = 15;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getFromName() { return fromName; }
    public void setFromName(String fromName) { this.fromName = fromName; }

    public String getReplyTo() { return replyTo; }
    public void setReplyTo(String replyTo) { this.replyTo = replyTo; }

    public String getResendApiKey() { return resendApiKey; }
    public void setResendApiKey(String resendApiKey) { this.resendApiKey = resendApiKey; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public boolean isResendConfigured() {
        return resendApiKey != null && !resendApiKey.isBlank();
    }
}
