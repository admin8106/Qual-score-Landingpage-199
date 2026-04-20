package com.qualscore.qualcore.whatsapp;

/**
 * Provider-agnostic contract for sending WhatsApp messages.
 *
 * Implementations:
 *   - {@link MetaCloudWhatsAppProvider}  — Meta WhatsApp Business Cloud API (primary)
 *   - {@link StubWhatsAppProvider}       — No-op stub used when no API key is configured
 *
 * Implementors must be thread-safe and stateless.
 */
public interface WhatsAppProvider {

    /**
     * Send a WhatsApp message using an approved template or free-form text.
     *
     * @param request provider-agnostic send request
     * @return result carrying success flag, provider message ID, and any error detail
     */
    WhatsAppSendResult send(WhatsAppSendRequest request);

    /**
     * Human-readable name of this provider (for logging/metrics).
     */
    String providerName();
}
