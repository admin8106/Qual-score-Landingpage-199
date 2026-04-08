package com.qualscore.qualcore.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Resend.com email provider.
 *
 * Sends transactional emails via the Resend REST API:
 *   POST https://api.resend.com/emails
 *
 * Features:
 *   - Multipart/alternative: sends both HTML and plain-text parts when textBody is set
 *   - From header uses "Name <address>" format
 *   - Optional reply-to header
 *   - Full error detail extracted from Resend's JSON error envelope
 *
 * Error handling:
 *   - HTTP 4xx: maps Resend error name + message to a failure result
 *   - HTTP 5xx / network timeout: failure result (caller decides on retry)
 *   - JSON parse failure: failure result with raw body snippet
 *
 * Thread-safety: stateless; WebClient is thread-safe.
 */
@Slf4j
@RequiredArgsConstructor
public class ResendEmailProvider implements EmailProvider {

    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final EmailProperties props;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "resend";
    }

    @Override
    public EmailSendResult send(EmailSendRequest request) {
        if (request.to() == null || request.to().isBlank()) {
            return EmailSendResult.failure("INVALID_EMAIL", "Recipient email is blank");
        }

        if (!isValidEmail(request.to())) {
            return EmailSendResult.failure("INVALID_EMAIL", "Invalid email address: " + request.to());
        }

        Map<String, Object> payload = buildPayload(request);

        log.info("[Email/Resend] Sending to={} subject='{}'", request.to(), request.subject());

        try {
            String responseBody = webClient.post()
                    .uri(RESEND_API_URL)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getResendApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                    .block();

            return parseSuccessResponse(responseBody);

        } catch (WebClientResponseException ex) {
            return parseErrorResponse(ex);
        } catch (Exception ex) {
            log.error("[Email/Resend] Unexpected error sending to={}: {}", request.to(), ex.getMessage(), ex);
            return EmailSendResult.failure("UNEXPECTED_ERROR", truncate(ex.getMessage(), 300));
        }
    }

    private Map<String, Object> buildPayload(EmailSendRequest request) {
        String fromHeader = (props.getFromName() != null && !props.getFromName().isBlank())
                ? props.getFromName() + " <" + props.getFromAddress() + ">"
                : props.getFromAddress();

        List<Object> toList = List.of(
                (request.toName() != null && !request.toName().isBlank())
                        ? request.toName() + " <" + request.to() + ">"
                        : request.to()
        );

        var payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("from", fromHeader);
        payload.put("to", toList);
        payload.put("subject", request.subject());
        payload.put("html", request.htmlBody());

        if (request.textBody() != null && !request.textBody().isBlank()) {
            payload.put("text", request.textBody());
        }

        String replyTo = props.getReplyTo();
        if (replyTo != null && !replyTo.isBlank()) {
            payload.put("reply_to", List.of(replyTo));
        }

        return payload;
    }

    private EmailSendResult parseSuccessResponse(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            String messageId = root.path("id").asText(null);
            log.info("[Email/Resend] Accepted messageId={}", messageId);
            return EmailSendResult.success(messageId);
        } catch (Exception e) {
            log.warn("[Email/Resend] Could not parse success response: {}", e.getMessage());
            return EmailSendResult.success(null);
        }
    }

    private EmailSendResult parseErrorResponse(WebClientResponseException ex) {
        String rawBody = ex.getResponseBodyAsString();
        log.warn("[Email/Resend] HTTP {} error: {}", ex.getStatusCode().value(), truncate(rawBody, 500));

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String name    = root.path("name").asText(null);
            String message = root.path("message").asText(ex.getMessage());
            String code    = name != null ? name : String.valueOf(ex.getStatusCode().value());
            String detail  = "[" + code + "] " + message;

            if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                return EmailSendResult.failure("RATE_LIMITED", detail);
            }
            return EmailSendResult.failure("PROVIDER_ERROR", detail);

        } catch (Exception parseEx) {
            return EmailSendResult.failure("PROVIDER_ERROR", truncate(rawBody, 300));
        }
    }

    private boolean isValidEmail(String email) {
        return email != null && email.contains("@") && email.contains(".");
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
