package com.qualscore.qualcore.email;

/**
 * Provider-agnostic contract for sending transactional emails.
 *
 * Implementations:
 *   - {@link ResendEmailProvider}  — Resend.com API (primary, default when key is present)
 *   - {@link StubEmailProvider}    — No-op stub for local development
 *
 * Implementors must be thread-safe and stateless.
 */
public interface EmailProvider {

    /**
     * Send a transactional email.
     *
     * @param request provider-agnostic send request
     * @return result carrying success flag, provider message ID, and any error detail
     */
    EmailSendResult send(EmailSendRequest request);

    /**
     * Human-readable name of this provider (for logging/metrics).
     */
    String providerName();
}
