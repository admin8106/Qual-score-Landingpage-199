package com.qualscore.qualcore.email;

/**
 * Provider-agnostic email send request.
 *
 * {@code to}        Recipient email address
 * {@code toName}    Recipient display name (used in From/To headers)
 * {@code subject}   Email subject line
 * {@code htmlBody}  Full HTML body (required)
 * {@code textBody}  Plain-text fallback body (optional; providers use it for multipart/alternative)
 */
public record EmailSendRequest(
        String to,
        String toName,
        String subject,
        String htmlBody,
        String textBody
) {
    public static EmailSendRequest of(String to, String toName, String subject,
                                      String htmlBody, String textBody) {
        return new EmailSendRequest(to, toName, subject, htmlBody, textBody);
    }
}
