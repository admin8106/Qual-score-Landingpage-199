package com.qualscore.qualcore.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class ProxycurlClient {

    private static final String PROXYCURL_BASE_URL = "https://nubela.co/proxycurl/api";

    @Value("${integrations.proxycurl.api-key:#{null}}")
    private String apiKey;

    private final WebClient webClient;

    public ProxycurlClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl(PROXYCURL_BASE_URL).build();
    }

    public Map<String, Object> fetchProfile(String linkedinUrl) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Proxycurl API key not configured — returning stub profile data for: {}", linkedinUrl);
            return buildStubProfile(linkedinUrl);
        }

        try {
            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v2/linkedin")
                            .queryParam("url", linkedinUrl)
                            .queryParam("use_cache", "if-recent")
                            .build())
                    .header("Authorization", "Bearer " + apiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Proxycurl fetch failed for {}: {}", linkedinUrl, e.getMessage());
            return buildStubProfile(linkedinUrl);
        }
    }

    private Map<String, Object> buildStubProfile(String linkedinUrl) {
        Map<String, Object> stub = new HashMap<>();
        stub.put("public_identifier", "stub-user");
        stub.put("profile_pic_url", null);
        stub.put("headline", "Professional seeking opportunities");
        stub.put("summary", null);
        stub.put("country", "IN");
        stub.put("experiences", java.util.List.of());
        stub.put("education", java.util.List.of());
        stub.put("certifications", java.util.List.of());
        stub.put("recommendations", java.util.List.of());
        stub.put("connections", 100);
        stub.put("stub", true);
        return stub;
    }
}
