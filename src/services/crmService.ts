/**
 * FUTURE INTEGRATION: CRM (HubSpot / Zoho / LeadSquared)
 *
 * This service will handle:
 * - Creating a contact record in the CRM when a lead pays and registers
 * - Updating the contact with diagnostic score and report URL
 * - Tagging leads by score level (critical / low / moderate / strong)
 * - Triggering CRM workflows (e.g., assign to sales rep if score < 50)
 * - Pushing consultation bookings to CRM pipeline
 *
 * Recommended: LeadSquared (popular in EdTech/HR India market)
 * Alternative: HubSpot (free tier available)
 *
 * Implementation: Supabase Edge Function `sync-crm`
 * Variables needed:
 * - CRM_API_KEY
 * - CRM_API_URL
 * - CRM_OWNER_ID (default sales rep)
 */

export async function syncLeadToCRM(
  _leadId: string,
  _name: string,
  _email: string,
  _phone: string,
  _score: number,
  _scoreLevel: string
): Promise<void> {
  // MOCK: No-op until real CRM integration
}
