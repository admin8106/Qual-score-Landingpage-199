package com.qualscore.qualcore.whatsapp;

import java.util.List;

/**
 * Provider-agnostic representation of a WhatsApp message send request.
 *
 * {@code to}           E.164-formatted phone number (e.g. "+919876543210")
 * {@code templateName} Approved template name in the Meta Business account
 * {@code languageCode} BCP-47 language code of the approved template (e.g. "en")
 * {@code components}   Ordered list of template body/header/button parameter values
 * {@code bodyText}     Fully-rendered body text (used by providers that accept free-form text)
 */
public record WhatsAppSendRequest(
        String to,
        String templateName,
        String languageCode,
        List<String> components,
        String bodyText
) {
    public static WhatsAppSendRequest of(String to, String templateName, List<String> components, String bodyText) {
        return new WhatsAppSendRequest(to, templateName, "en", components, bodyText);
    }
}
