package com.qualscore.qualcore.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.repository.CommunicationEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Handles inbound webhooks from the Meta WhatsApp Business Cloud API.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Two endpoints:
 *
 *   GET  /api/webhooks/whatsapp
 *     Webhook verification challenge (required by Meta to activate the webhook).
 *     Meta sends: hub.mode=subscribe, hub.verify_token=<your token>, hub.challenge=<nonce>
 *     We respond with the nonce string if the verify_token matches.
 *
 *   POST /api/webhooks/whatsapp
 *     Delivery status updates (sent, delivered, read, failed).
 *     Parses the statuses array from the Meta webhook payload and updates
 *     the corresponding CommunicationEvent row's delivery_status.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Meta webhook payload shape (relevant excerpt):
 * {
 *   "entry": [{
 *     "changes": [{
 *       "value": {
 *         "statuses": [{
 *           "id": "<wamid>",
 *           "status": "sent" | "delivered" | "read" | "failed",
 *           "errors": [{ "code": 123, "title": "..." }]
 *         }]
 *       }
 *     }]
 *   }]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Security:
 *   - Meta signs webhook payloads with HMAC-SHA256 using the App Secret.
 *     The X-Hub-Signature-256 header can be verified here if needed.
 *     Currently we rely on the verify_token challenge to prevent spoofing
 *     of the registration step, and accept status callbacks on the POST.
 *     For hardened production use, uncomment the signature verification block.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Required environment variable:
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN  — must match the value set in Meta Business Manager
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
public class WhatsAppWebhookController {

    private final WhatsAppProperties props;
    private final CommunicationEventRepository communicationEventRepository;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String verifyToken,
            @RequestParam("hub.challenge") String challenge) {

        if (!"subscribe".equals(mode)) {
            log.warn("[WhatsApp/Webhook] Unexpected hub.mode={}", mode);
            return ResponseEntity.badRequest().body("Unexpected mode");
        }

        String expectedToken = props.getWebhookVerifyToken();
        if (expectedToken == null || expectedToken.isBlank()) {
            log.error("[WhatsApp/Webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured");
            return ResponseEntity.status(500).body("Webhook token not configured");
        }

        if (!expectedToken.equals(verifyToken)) {
            log.warn("[WhatsApp/Webhook] Verify token mismatch");
            return ResponseEntity.status(403).body("Forbidden");
        }

        log.info("[WhatsApp/Webhook] Verification successful, returning challenge");
        return ResponseEntity.ok(challenge);
    }

    @PostMapping
    public ResponseEntity<String> handleStatusUpdate(@RequestBody String rawBody) {
        log.debug("[WhatsApp/Webhook] Received payload: {}", rawBody);

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode entries = root.path("entry");

            if (!entries.isArray()) {
                return ResponseEntity.ok("ok");
            }

            for (JsonNode entry : entries) {
                for (JsonNode change : entry.path("changes")) {
                    JsonNode value = change.path("value");
                    processStatuses(value.path("statuses"));
                }
            }
        } catch (Exception e) {
            log.error("[WhatsApp/Webhook] Failed to parse payload: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok("ok");
    }

    private void processStatuses(JsonNode statuses) {
        if (!statuses.isArray()) return;

        for (JsonNode statusNode : statuses) {
            String wamid = statusNode.path("id").asText(null);
            String status = statusNode.path("status").asText(null);

            if (wamid == null || status == null) continue;

            log.info("[WhatsApp/Webhook] Status update wamid={} status={}", wamid, status);

            Optional<CommunicationEvent> eventOpt =
                    communicationEventRepository.findByProviderMessageId(wamid);

            if (eventOpt.isEmpty()) {
                log.debug("[WhatsApp/Webhook] No CommunicationEvent found for wamid={}", wamid);
                continue;
            }

            CommunicationEvent event = eventOpt.get();
            DeliveryStatus newStatus = mapMetaStatus(status);

            if (newStatus != null && newStatus != event.getDeliveryStatus()) {
                event.setDeliveryStatus(newStatus);

                if (newStatus == DeliveryStatus.FAILED) {
                    JsonNode errors = statusNode.path("errors");
                    if (errors.isArray() && !errors.isEmpty()) {
                        String errorTitle = errors.get(0).path("title").asText(null);
                        String errorCode  = errors.get(0).path("code").asText(null);
                        event.setErrorMessage("[" + errorCode + "] " + errorTitle);
                    }
                }

                communicationEventRepository.save(event);
                log.info("[WhatsApp/Webhook] Updated event id={} wamid={} → {}",
                        event.getId(), wamid, newStatus);
            }
        }
    }

    private DeliveryStatus mapMetaStatus(String metaStatus) {
        return switch (metaStatus) {
            case "sent"      -> DeliveryStatus.SENT;
            case "delivered" -> DeliveryStatus.DELIVERED;
            case "read"      -> DeliveryStatus.DELIVERED;
            case "failed"    -> DeliveryStatus.FAILED;
            default          -> null;
        };
    }
}
