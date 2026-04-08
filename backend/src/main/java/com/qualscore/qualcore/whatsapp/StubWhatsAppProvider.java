package com.qualscore.qualcore.whatsapp;

import lombok.extern.slf4j.Slf4j;

/**
 * No-op WhatsApp provider used when no API credentials are configured.
 *
 * Logs the would-be message at INFO level so developers can verify the
 * message content and parameter substitution without hitting a real API.
 */
@Slf4j
public class StubWhatsAppProvider implements WhatsAppProvider {

    @Override
    public String providerName() {
        return "stub";
    }

    @Override
    public WhatsAppSendResult send(WhatsAppSendRequest request) {
        log.info("[WhatsApp/Stub] WOULD SEND to={} template={} body={}",
                request.to(), request.templateName(), request.bodyText());
        return WhatsAppSendResult.success("stub-" + System.currentTimeMillis());
    }
}
