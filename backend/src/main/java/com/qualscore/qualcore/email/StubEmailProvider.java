package com.qualscore.qualcore.email;

import lombok.extern.slf4j.Slf4j;

/**
 * No-op email provider used when no API key is configured.
 *
 * Logs the would-be message at INFO level so developers can verify
 * subject lines, recipient addresses, and body content without hitting
 * a real email API.
 */
@Slf4j
public class StubEmailProvider implements EmailProvider {

    @Override
    public String providerName() {
        return "stub";
    }

    @Override
    public EmailSendResult send(EmailSendRequest request) {
        log.info("[Email/Stub] WOULD SEND to={} subject='{}' (html length={})",
                request.to(), request.subject(),
                request.htmlBody() != null ? request.htmlBody().length() : 0);
        return EmailSendResult.success("stub-" + System.currentTimeMillis());
    }
}
