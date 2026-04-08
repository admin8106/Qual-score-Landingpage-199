package com.qualscore.qualcore.crm;

import lombok.extern.slf4j.Slf4j;

/**
 * No-op CRM provider used when no webhook URL is configured or CRM is disabled.
 *
 * Logs the would-be payload summary at INFO level so developers can verify
 * trigger logic and field values without requiring a real CRM endpoint.
 */
@Slf4j
public class StubCrmProvider implements CrmProvider {

    @Override
    public String providerName() {
        return "stub";
    }

    @Override
    public CrmPushResult push(CrmPushRequest request) {
        log.info("[CRM/Stub] WOULD PUSH candidateRef={} event={} priority={} score={} tags={}",
                request.payload().candidateReference(),
                request.payload().triggerEvent(),
                request.payload().leadPriority(),
                request.payload().finalEmployabilityScore(),
                request.payload().tags());
        return CrmPushResult.success("stub-" + System.currentTimeMillis());
    }
}
