package com.qualscore.qualcore.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Component
public class SlackClient {

    @Value("${integrations.slack.webhook-url:#{null}}")
    private String webhookUrl;

    private final WebClient webClient;

    public SlackClient(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    public void sendAlert(String message) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.info("[Slack STUB] Would send alert: {}", message);
            return;
        }

        try {
            webClient.post()
                    .uri(webhookUrl)
                    .bodyValue(Map.of("text", message))
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Slack alert sent");
        } catch (Exception e) {
            log.error("Failed to send Slack alert: {}", e.getMessage());
        }
    }

    public void alertHighPriorityLead(String leadName, String email, double score, String band) {
        String message = String.format(
                ":rotating_light: *High-Priority Lead Detected*\n" +
                "*Name:* %s | *Email:* %s\n" +
                "*Score:* %.1f | *Band:* %s",
                leadName, email, score, band
        );
        sendAlert(message);
    }
}
