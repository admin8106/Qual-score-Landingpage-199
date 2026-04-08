package com.qualscore.qualcore.crm;

/**
 * Provider-agnostic contract for pushing lead/diagnostic data into a CRM.
 *
 * Implementations:
 *   - {@link WebhookCrmProvider}  — Generic HTTP webhook (JSON POST); works with any
 *                                   Zapier/Make webhook, n8n, custom internal CRM endpoint,
 *                                   or native CRM webhook receiver (HubSpot, Zoho, etc.)
 *   - {@link StubCrmProvider}     — No-op that logs the payload; safe for local dev
 *
 * Future provider stubs to add when native SDK support is needed:
 *   - HubSpotCrmProvider  — uses HubSpot Contacts + Deals API
 *   - ZohoCrmProvider     — uses Zoho CRM v7 Leads API
 *   - SalesforceCrmProvider — uses Salesforce REST API (composite resource)
 *
 * All implementations must be:
 *   - Thread-safe and stateless
 *   - Non-blocking from the service layer's perspective (use reactive or virtual threads)
 *   - Failure-safe: never propagate unchecked exceptions; always return a {@link CrmPushResult}
 */
public interface CrmProvider {

    /**
     * Push a lead/diagnostic record to the CRM.
     *
     * @param request enriched push request
     * @return result carrying success flag, CRM record ID, and any error detail
     */
    CrmPushResult push(CrmPushRequest request);

    /**
     * Human-readable provider name (for logging/metrics).
     */
    String providerName();
}
