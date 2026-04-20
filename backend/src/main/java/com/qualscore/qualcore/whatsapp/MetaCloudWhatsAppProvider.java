package com.qualscore.qualcore.whatsapp;

import com.fasterxml.jackson.annotation.JsonProperty;
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

/**
 * Meta WhatsApp Business Cloud API provider.
 *
 * Sends WhatsApp messages via the official Meta Graph API:
 *   POST https://graph.facebook.com/{version}/{phone_number_id}/messages
 *
 * Strategy:
 *   1. Try to send as a template message (if templateName is set).
 *   2. If the approved template name is empty, fall back to a free-text message
 *      (only works if the recipient has an active 24-hour service window).
 *
 * Error handling:
 *   - HTTP 4xx: maps provider error code and message to a failure result
 *   - HTTP 5xx / network timeout: returns a failure result (caller decides on retry)
 *   - JSON parse failure: returns a failure result with the raw body snippet
 *
 * Thread-safety: stateless; WebClient is thread-safe.
 */
@Slf4j
@RequiredArgsConstructor
public class MetaCloudWhatsAppProvider implements WhatsAppProvider {

    private static final String GRAPH_BASE = "https://graph.facebook.com";

    private final WhatsAppProperties props;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "meta-cloud";
    }

    @Override
    public WhatsAppSendResult send(WhatsAppSendRequest request) {
        if (request.to() == null || request.to().isBlank()) {
            return WhatsAppSendResult.failure("INVALID_PHONE", "Phone number is blank");
        }

        String normalizedPhone = normalizePhone(request.to());
        if (normalizedPhone == null) {
            return WhatsAppSendResult.failure("INVALID_PHONE",
                    "Phone number cannot be normalized to E.164: " + request.to());
        }

        Object payload = buildPayload(normalizedPhone, request);
        String url = GRAPH_BASE + "/" + props.getApiVersion() + "/" + props.getPhoneNumberId() + "/messages";

        log.info("[WhatsApp/Meta] Sending to={} template={}", normalizedPhone, request.templateName());

        try {
            String responseBody = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getAccessToken())
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
            log.error("[WhatsApp/Meta] Unexpected error sending to={}: {}", normalizedPhone, ex.getMessage(), ex);
            return WhatsAppSendResult.failure("UNEXPECTED_ERROR", truncate(ex.getMessage(), 300));
        }
    }

    private Object buildPayload(String to, WhatsAppSendRequest request) {
        if (request.templateName() != null && !request.templateName().isBlank()) {
            return buildTemplatePayload(to, request);
        }
        return buildFreeTextPayload(to, request.bodyText());
    }

    private TemplateMessagePayload buildTemplatePayload(String to, WhatsAppSendRequest request) {
        List<TemplateComponent> components = new ArrayList<>();

        if (request.components() != null && !request.components().isEmpty()) {
            List<TemplateParameter> parameters = request.components().stream()
                    .map(v -> new TemplateParameter("text", v))
                    .toList();
            components.add(new TemplateComponent("body", parameters));
        }

        TemplateLanguage language = new TemplateLanguage(request.languageCode());
        TemplateSpec template = new TemplateSpec(request.templateName(), language, components);
        return new TemplateMessagePayload(to, "template", template);
    }

    private FreeTextPayload buildFreeTextPayload(String to, String body) {
        return new FreeTextPayload(to, "text", new TextBody(body != null ? body : ""));
    }

    private WhatsAppSendResult parseSuccessResponse(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode messages = root.path("messages");
            if (messages.isArray() && !messages.isEmpty()) {
                String messageId = messages.get(0).path("id").asText(null);
                log.info("[WhatsApp/Meta] Message accepted messageId={}", messageId);
                return WhatsAppSendResult.success(messageId);
            }
            log.warn("[WhatsApp/Meta] Unexpected success body: {}", truncate(body, 400));
            return WhatsAppSendResult.success(null);
        } catch (Exception e) {
            log.warn("[WhatsApp/Meta] Could not parse success response: {}", e.getMessage());
            return WhatsAppSendResult.success(null);
        }
    }

    private WhatsAppSendResult parseErrorResponse(WebClientResponseException ex) {
        String rawBody = ex.getResponseBodyAsString();
        log.warn("[WhatsApp/Meta] HTTP {} error: {}", ex.getStatusCode().value(), truncate(rawBody, 500));

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode error = root.path("error");
            String code = error.path("code").asText(String.valueOf(ex.getStatusCode().value()));
            String message = error.path("message").asText(ex.getMessage());
            String subcode = error.path("error_subcode").asText(null);
            String detail = subcode != null ? "[" + code + "/" + subcode + "] " + message : "[" + code + "] " + message;

            if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                return WhatsAppSendResult.failure("RATE_LIMITED", detail);
            }
            return WhatsAppSendResult.failure("PROVIDER_ERROR", detail);

        } catch (Exception parseEx) {
            return WhatsAppSendResult.failure("PROVIDER_ERROR", truncate(rawBody, 300));
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[^\\d+]", "");
        if (digits.startsWith("+")) {
            String stripped = digits.substring(1);
            if (stripped.length() >= 7 && stripped.length() <= 15) return stripped;
        }
        String stripped = digits.replaceAll("^\\+?0+", "");
        if (stripped.length() >= 7 && stripped.length() <= 15) return stripped;
        return null;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    // ── Internal DTO records ──────────────────────────────────────────────────

    record TemplateMessagePayload(String to, String type, TemplateSpec template) {}

    record TemplateSpec(String name, TemplateLanguage language, List<TemplateComponent> components) {}

    record TemplateLanguage(String code) {}

    record TemplateComponent(String type, List<TemplateParameter> parameters) {}

    record TemplateParameter(String type, String text) {}

    record FreeTextPayload(String to, String type, TextBody text) {}

    record TextBody(String body) {}
}
