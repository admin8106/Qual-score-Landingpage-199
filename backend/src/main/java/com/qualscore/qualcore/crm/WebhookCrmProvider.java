package com.qualscore.qualcore.crm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.notification.CrmPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * Generic HTTP webhook CRM provider.
 *
 * Sends a JSON POST to {@code CrmProperties.webhookUrl} carrying a flat,
 * CRM-friendly representation of the lead's diagnostic data.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Compatibility
 * ─────────────────────────────────────────────────────────────────────────
 * This provider is compatible out-of-the-box with:
 *   - Zapier Webhooks (catch hook → action)
 *   - Make (Integromat) webhook triggers
 *   - n8n webhook nodes
 *   - HubSpot Custom Webhook receiver (Operations Hub)
 *   - Any custom internal CRM REST endpoint accepting JSON
 *
 * For native HubSpot/Zoho/Salesforce API support, create a dedicated
 * provider implementing {@link CrmProvider} and register it in
 * {@link CrmProviderConfig}. See DEVELOPER_NOTES for field-mapping guide.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Payload shape (flat JSON)
 * ─────────────────────────────────────────────────────────────────────────
 * {
 *   "candidate_reference": "QS-2024-ABCD",
 *   "full_name": "Priya Sharma",
 *   "email": "priya@example.com",
 *   "mobile_number": "+919876543210",
 *   "current_role": "Software Engineer",
 *   "experience_years": "5",
 *   "career_stage": "MID",
 *   "industry": "Technology",
 *   "linkedin_url": "https://linkedin.com/in/priya",
 *   "employability_score": 6.4,
 *   "score_band": "Needs Optimization",
 *   "lead_priority": "HIGH",
 *   "tags": ["HIGH_PAIN_LEAD", "CONSULTATION_PRIORITY"],
 *   "payment_status": "COMPLETED",
 *   "report_status": "GENERATED",
 *   "consultation_status": "NONE",
 *   "trigger_event": "REPORT_GENERATED",
 *   "event_timestamp": "2024-01-15T10:30:00Z",
 *   "source": "qualscore_diagnostic"
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Retry behaviour
 * ─────────────────────────────────────────────────────────────────────────
 * Retries on HTTP 429 and 5xx up to {@code CrmProperties.maxRetries} times
 * with 2-second backoff. 4xx errors (except 429) are not retried — they
 * indicate a configuration or payload problem that won't resolve on retry.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Authentication
 * ─────────────────────────────────────────────────────────────────────────
 * Configured via:
 *   CRM_WEBHOOK_AUTH_HEADER (default: "Authorization")
 *   CRM_WEBHOOK_AUTH_PREFIX (default: "Bearer ")
 *   CRM_WEBHOOK_SECRET
 *
 * Resulting header: Authorization: Bearer <CRM_WEBHOOK_SECRET>
 * For HMAC or custom schemes, implement a dedicated CrmProvider instead.
 */
@Slf4j
@RequiredArgsConstructor
public class WebhookCrmProvider implements CrmProvider {

    private static final int RETRY_BACKOFF_SECONDS = 2;

    private final CrmProperties props;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String providerName() {
        return "webhook";
    }

    @Override
    public CrmPushResult push(CrmPushRequest request) {
        Map<String, Object> body = buildFlatPayload(request.payload(), request.idempotencyKey());

        log.info("[CRM/Webhook] Pushing candidateRef={} event={} to={}",
                request.payload().candidateReference(),
                request.payload().triggerEvent(),
                props.getWebhookUrl());

        return executeWithRetry(body, props.getMaxRetries());
    }

    private CrmPushResult executeWithRetry(Map<String, Object> body, int remainingRetries) {
        try {
            String response = webClient.post()
                    .uri(props.getWebhookUrl())
                    .header(buildAuthHeader(), buildAuthValue())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header("X-Source", "qualscore-diagnostic")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                    .block();

            String recordId = extractRecordId(response);
            log.info("[CRM/Webhook] Accepted recordId={}", recordId);
            return CrmPushResult.success(recordId);

        } catch (WebClientResponseException ex) {
            int status = ex.getStatusCode().value();
            boolean retryable = status == 429 || status >= 500;

            if (retryable && remainingRetries > 0) {
                log.warn("[CRM/Webhook] HTTP {} — retrying ({} left)", status, remainingRetries);
                sleep(RETRY_BACKOFF_SECONDS);
                return executeWithRetry(body, remainingRetries - 1);
            }

            String detail = extractErrorDetail(ex);
            log.error("[CRM/Webhook] HTTP {} non-retryable or retries exhausted: {}", status, detail);
            return CrmPushResult.failure("HTTP_" + status, detail);

        } catch (Exception ex) {
            if (isTransient(ex) && remainingRetries > 0) {
                log.warn("[CRM/Webhook] Transient error '{}' — retrying ({} left)",
                        ex.getMessage(), remainingRetries);
                sleep(RETRY_BACKOFF_SECONDS);
                return executeWithRetry(body, remainingRetries - 1);
            }
            log.error("[CRM/Webhook] Unexpected error: {}", ex.getMessage(), ex);
            return CrmPushResult.failure("UNEXPECTED_ERROR", truncate(ex.getMessage(), 300));
        }
    }

    private Map<String, Object> buildFlatPayload(CrmPayload p, String idempotencyKey) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("candidate_reference", p.candidateReference());
        m.put("full_name", p.fullName());
        m.put("email", p.email());
        m.put("mobile_number", p.mobileNumber());
        m.put("current_role", p.currentRole());
        m.put("experience_years", p.totalExperienceYears());
        m.put("career_stage", p.careerStage() != null ? p.careerStage().name() : null);
        m.put("industry", p.industry());
        m.put("linkedin_url", p.linkedinUrl());
        m.put("employability_score", p.finalEmployabilityScore());
        m.put("score_band", p.bandLabel());
        m.put("lead_priority", p.leadPriority());
        m.put("tags", p.tags());
        m.put("payment_status", p.paymentStatus());
        m.put("report_status", p.reportStatus());
        m.put("consultation_status", p.consultationStatus());
        m.put("trigger_event", p.triggerEvent());
        m.put("event_timestamp", p.eventTimestamp() != null ? p.eventTimestamp().toString() : null);
        m.put("candidate_created_at", p.createdAt() != null ? p.createdAt().toString() : null);
        m.put("idempotency_key", idempotencyKey);
        m.put("source", "qualscore_diagnostic");
        return m;
    }

    private String buildAuthHeader() {
        String header = props.getWebhookAuthHeader();
        return (header != null && !header.isBlank()) ? header : HttpHeaders.AUTHORIZATION;
    }

    private String buildAuthValue() {
        String secret = props.getWebhookSecret();
        if (secret == null || secret.isBlank()) return "";
        String prefix = props.getWebhookAuthPrefix();
        return (prefix != null ? prefix : "Bearer ") + secret;
    }

    private String extractRecordId(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) return null;
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            for (String field : new String[]{"id", "record_id", "contactId", "leadId"}) {
                if (!root.path(field).isMissingNode()) {
                    return root.path(field).asText();
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String extractErrorDetail(WebClientResponseException ex) {
        String raw = ex.getResponseBodyAsString();
        try {
            JsonNode root = objectMapper.readTree(raw);
            String msg = root.path("message").asText(null);
            if (msg == null) msg = root.path("error").asText(null);
            return msg != null ? msg : truncate(raw, 300);
        } catch (Exception e) {
            return truncate(raw, 300);
        }
    }

    private boolean isTransient(Exception ex) {
        String msg = ex.getMessage();
        return msg != null && (
                msg.contains("timeout") ||
                msg.contains("connection") ||
                msg.contains("reset") ||
                msg.contains("refused")
        );
    }

    private void sleep(int seconds) {
        try { Thread.sleep(seconds * 1000L); } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
