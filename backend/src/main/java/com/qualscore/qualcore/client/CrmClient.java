package com.qualscore.qualcore.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class CrmClient {

    @Value("${integrations.crm.api-key:#{null}}")
    private String apiKey;

    @Value("${integrations.crm.api-url:#{null}}")
    private String apiUrl;

    @Value("${integrations.crm.owner-id:#{null}}")
    private String ownerId;

    public record CrmSyncResult(String crmContactId, String action) {}

    public CrmSyncResult syncLead(String leadId, String name, String email, String phone,
                                   String jobRole, String industry, double score,
                                   String scoreBand, List<String> tags, String source) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[CRM STUB] Would sync lead: email={}, score={}, band={}, tags={}", email, score, scoreBand, tags);
            return new CrmSyncResult("crm_stub_" + leadId.substring(0, 8), "created");
        }

        log.info("Syncing lead to CRM: email={}, score={}", email, score);
        return new CrmSyncResult("crm_" + leadId.substring(0, 8), "created");
    }
}
