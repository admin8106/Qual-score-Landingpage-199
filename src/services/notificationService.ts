/**
 * FUTURE INTEGRATION: WhatsApp & Email Notifications
 *
 * WHATSAPP:
 * - Provider: Interakt / AiSensy / Wati (WhatsApp Business API)
 * - Trigger: After report generation
 * - Message: Report summary + consultation booking link
 * - Template: Pre-approved WhatsApp Business template
 * - Implementation: Supabase Edge Function `send-whatsapp`
 * - Variables needed: WHATSAPP_API_KEY, WHATSAPP_SENDER_NUMBER
 *
 * EMAIL:
 * - Provider: Resend (https://resend.com) or SendGrid
 * - Trigger 1: Payment confirmation → send receipt
 * - Trigger 2: Report generated → send full PDF report link
 * - Trigger 3: 24h follow-up → consultation booking nudge
 * - Implementation: Supabase Edge Function `send-email`
 * - Variables needed: RESEND_API_KEY, FROM_EMAIL
 *
 * PDF Generation:
 * - Use Puppeteer or a hosted PDF service (e.g., pdfcrowd) to render report page as PDF
 * - Store in Supabase Storage and include download link in email
 */

export async function sendReportWhatsApp(
  _phone: string,
  _name: string,
  _score: number,
  _reportUrl: string
): Promise<void> {
  // MOCK: No-op until real integration
}

export async function sendConfirmationEmail(
  _email: string,
  _name: string,
  _paymentRef: string
): Promise<void> {
  // MOCK: No-op until real integration
}

export async function sendReportEmail(
  _email: string,
  _name: string,
  _reportUrl: string
): Promise<void> {
  // MOCK: No-op until real integration
}
