# QualCore — Backend Developer Notes

Spring Boot 3 backend for the **QualScore Employability Diagnostic Report** product.

---

## Module Purpose

This service is the authoritative backend for the QualScore diagnostic product. It handles:

- Payment initiation and HMAC-SHA256 verification (Razorpay)
- Candidate profile persistence
- Diagnostic answer storage (15-question assessment)
- Server-side scoring engine (prevents client-side manipulation)
- LinkedIn profile analysis via Proxycurl + LLM
- AI-generated personalised report via OpenAI
- Consultation booking with unique booking reference generation
- Admin panel data: paginated lead list, funnel analytics
- Analytics event ingestion

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Language       | Java 21                           |
| Framework      | Spring Boot 3.2                   |
| ORM            | Spring Data JPA / Hibernate       |
| Database       | PostgreSQL (Supabase)             |
| Security       | Spring Security + JWT (stateless) |
| HTTP Client    | Spring WebFlux WebClient          |
| API Docs       | SpringDoc OpenAPI 3 / Swagger UI  |
| Code Gen       | Lombok, MapStruct                 |
| Build          | Maven 3.9+                        |
| Runtime        | Java 21 (LTS)                     |

---

## Package Structure

```
com.qualscore.qualcore
├── QualCoreApplication.java          # Entry point
├── controller/                       # REST controllers (thin layer)
│   ├── SystemController              # GET /api/system/health, /version
│   ├── PaymentController             # POST /api/payment/initiate, /verify
│   ├── LeadController                # POST /api/leads
│   ├── DiagnosticController          # POST /api/diagnostic/responses, /calculate
│   ├── AnalysisController            # POST /api/analysis/linkedin
│   ├── ReportController              # POST /api/report/generate, GET /api/report/{id}
│   ├── BookingController             # POST /api/booking/consultation
│   ├── AnalyticsController           # POST /api/analytics/event
│   └── AdminController               # GET /api/admin/leads, /analytics [auth required]
├── service/                          # Service interfaces
│   └── impl/                         # Service implementations
├── repository/                       # Spring Data JPA repositories
├── entity/                           # JPA entities (Lead, DiagnosticSession, Report, Consultation, AnalyticsEvent)
├── dto/
│   ├── request/                      # Inbound request DTOs (validated)
│   └── response/                     # Outbound response DTOs
├── mapper/                           # MapStruct mappers (add as needed)
├── config/                           # Spring config: Jackson, OpenAPI, WebClient
├── security/                         # JWT filter, SecurityConfig, JwtService
├── enums/                            # Shared enums: PaymentStatus, ScoreBand, CareerStage, etc.
├── util/                             # ScoringEngine, BookingRefGenerator
├── exception/                        # BusinessException hierarchy, GlobalExceptionHandler
├── client/                           # External API stubs: LLM, Proxycurl, WhatsApp, Email, CRM, Slack, Calendar
└── validation/                       # Custom validators (add as needed)
```

---

## API Response Convention

All endpoints return a consistent envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "RESOURCE_NOT_FOUND", "message": "...", "details": {} } }
```

---

## Scoring Formula

```
Final Employability Score =
  (LinkedIn × 0.40) + (Career Direction × 0.12) + (Job Search × 0.12)
  + (Opportunity Readiness × 0.16) + (Flexibility × 0.10) + (Improvement Intent × 0.10)

Score Bands:
  Critical            ≤ 4.9
  Needs Optimization  5.0 – 7.4
  Strong              ≥ 7.5
```

---

## Environment Variables

Copy `.env.example` and populate before running locally.

| Variable                 | Required | Description                            |
|--------------------------|----------|----------------------------------------|
| `DB_URL`                 | Yes      | PostgreSQL JDBC URL (Supabase)         |
| `DB_USERNAME`            | Yes      | Database user                          |
| `DB_PASSWORD`            | Yes      | Database password                      |
| `JWT_SECRET`             | Yes      | Signing secret for admin JWT (32+ chars) |
| `RAZORPAY_KEY_ID`        | Prod     | Razorpay public key                    |
| `RAZORPAY_KEY_SECRET`    | Prod     | Razorpay secret (HMAC verification)    |
| `OPENAI_API_KEY`         | Prod     | OpenAI API key (LLM calls)             |
| `PROXYCURL_API_KEY`      | Prod     | Proxycurl API key (LinkedIn scraping)  |
| `WHATSAPP_API_KEY`       | Opt      | WhatsApp Business API key              |
| `WHATSAPP_SENDER_ID`     | Opt      | Approved sender number                 |
| `RESEND_API_KEY`         | Opt      | Resend.com API key (email)             |
| `EMAIL_FROM_ADDRESS`     | Opt      | From address for outbound emails       |
| `CRM_API_KEY`            | Opt      | HubSpot or LeadSquared API key         |
| `CRM_API_URL`            | Opt      | CRM region endpoint                    |
| `SLACK_WEBHOOK_URL`      | Opt      | Slack incoming webhook (ops alerts)    |
| `CALENDLY_API_KEY`       | Opt      | Calendly API key                       |
| `CORS_ALLOWED_ORIGINS`   | Dev      | Comma-separated origins for React dev  |
| `APP_ENV`                | Dev      | Environment name (local/staging/prod)  |

---

## Running Locally

**Prerequisites:** Java 21, Maven 3.9+, PostgreSQL (or a Supabase connection string)

```bash
# 1. Set env vars (or use .env + spring-dotenv)
export DB_URL=jdbc:postgresql://<supabase-host>:5432/postgres
export DB_USERNAME=postgres
export DB_PASSWORD=<your-password>
export JWT_SECRET=dev-secret-at-least-32-chars-long

# 2. Build
mvn clean package -DskipTests

# 3. Run
java -jar target/qualcore-1.0.0.jar
```

**Swagger UI:** http://localhost:8080/swagger-ui.html
**Health:** http://localhost:8080/actuator/health
**Version:** http://localhost:8080/api/system/version

---

## External Client Status

All external clients are **stub-safe**: they log intent and return mock data when the API key is absent. This means the service starts and operates end-to-end without any third-party credentials in development.

| Client           | Stub Behaviour                          | Production Integration         |
|------------------|-----------------------------------------|-------------------------------|
| `LlmClient`      | Returns rule-based report / mock analysis | OpenAI GPT-4o                |
| `ProxycurlClient`| Returns empty stub profile              | Proxycurl LinkedIn API         |
| `WhatsAppClient` | Delegates to StubWhatsAppProvider       | Meta WhatsApp Business Cloud API |
| `EmailClient`    | Logs intent to console                  | Resend.com / SendGrid          |
| `CrmClient`      | Returns stub CRM ID                     | HubSpot / LeadSquared          |
| `SlackClient`    | Logs intent to console                  | Slack Incoming Webhooks        |
| `CalendarClient` | Returns null booking result             | Calendly / Cal.com             |

---

## Email Integration (Resend)

### Architecture

```
AutomationTriggerServiceImpl
  └─► CommunicationEventService.dispatchEmail(...)
        └─► EmailNotificationService
              ├─ Idempotency check (idempotency_key = candidateCode::email::templateCode)
              ├─ Persist PENDING row
              ├─ EmailTemplateRenderer → HTML (branded) + plain text
              ├─► EmailProvider (interface)
              │     ├─ ResendEmailProvider  (when RESEND_API_KEY is set)
              │     └─ StubEmailProvider    (when no key — logs only)
              └─ Update row to SENT | FAILED
```

### Provider Selection

| Condition | Provider selected |
|-----------|------------------|
| `integrations.email.resend-api-key` is populated | `ResendEmailProvider` |
| Key absent | `StubEmailProvider` (safe dev mode) |

Active provider logged at startup:
```
[Email] Provider: resend | from=QualScore <reports@qualscore.in>
[Email] Provider: stub (no RESEND_API_KEY configured)
```

### Emails sent

| Event | Template | Subject |
|-------|----------|---------|
| `REPORT_GENERATED` | `EMAIL_REPORT_READY` | "Your Employability Diagnostic Report is Ready" |
| `REPORT_VIEWED` | `EMAIL_PROFILE_NOT_SHORTLISTED` | "Why your profile may not be getting shortlisted" |
| `CONSULTATION_CTA_CLICKED` | `EMAIL_CONSULTATION_URGENCY` | "Don't ignore this" |
| `CONSULTATION_BOOKED` | `EMAIL_BOOKING_CONFIRMED` | "Consultation Confirmed – [BOOKING_REF]" |

### Email Format

All emails are sent as **multipart/alternative** (HTML + plain text):
- **HTML**: Branded responsive template with inline CSS, score display, CTA button, header/footer
- **Plain text**: Token-substituted body from `NotificationTemplateRegistry`

### Environment Variables (Email)

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_PROVIDER` | No | `stub` (default) or `resend` |
| `RESEND_API_KEY` | For Resend | API key from resend.com dashboard |
| `EMAIL_FROM_ADDRESS` | For Resend | Verified sender address |
| `EMAIL_FROM_NAME` | No | Display name in From header (default: `QualScore`) |
| `EMAIL_REPLY_TO` | No | Reply-to address (defaults to from) |
| `EMAIL_TIMEOUT_SECONDS` | No | HTTP read timeout (default: `15`) |

### Setting up Resend

1. Create an account at [resend.com](https://resend.com).
2. Add and verify your sending domain under **Domains**.
3. Create an API key under **API Keys** (full-access or sending-only).
4. Set `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` and restart the service.
5. Optionally set `EMAIL_PROVIDER=resend` (auto-detected when key is present).

### Idempotency

Idempotency key: `candidateCode::email::templateCode`
- `SENT` / `DELIVERED` → skip
- `PENDING` → skip (in-flight)
- `FAILED` → retry

---

## CRM Integration

### Architecture

```
AutomationTriggerServiceImpl
  └─► CommunicationEventService.dispatchCrm(candidate, eventType, score, report, booking, payments)
        └─► CommunicationEventServiceImpl
              └─► CrmNotificationService
                    ├─ Idempotency check (idempotency_key = candidateCode::crm::eventType)
                    ├─ CrmPayloadBuilder → CrmPayload (enriched canonical payload)
                    ├─ Persist PENDING row
                    ├─► CrmProvider (interface)
                    │     ├─ WebhookCrmProvider  (when CRM_WEBHOOK_URL is set)
                    │     └─ StubCrmProvider      (when URL absent or CRM_ENABLED=false)
                    └─ Update row to SENT | FAILED
```

### Provider Selection

| Condition | Provider selected |
|-----------|------------------|
| `integrations.crm.enabled=false` | `StubCrmProvider` |
| `provider=webhook` AND `webhook-url` populated | `WebhookCrmProvider` |
| `provider=stub` or no URL | `StubCrmProvider` |

Active provider logged at startup:
```
[CRM] Provider: webhook | url=https://hooks.zapier.com/...
[CRM] Provider: stub (provider='stub', no webhook URL configured)
[CRM] Disabled via integrations.crm.enabled=false → using StubCrmProvider
```

### Trigger Points

| Event | Trigger method | When |
|-------|---------------|------|
| `REPORT_GENERATED` | `onReportGenerated()` | After diagnostic analysis + report saved |
| `HIGH_PRIORITY_LEAD_IDENTIFIED` | `onHighPriorityLead()` | Score < 5.0 (same flow as report generated) |
| `CONSULTATION_BOOKED` | `onConsultationBooked()` | After booking confirmation saved |

### CRM Payload (Flat JSON)

```json
{
  "candidate_reference": "QS-2024-ABCD",
  "full_name": "Priya Sharma",
  "email": "priya@example.com",
  "mobile_number": "+919876543210",
  "current_role": "Software Engineer",
  "experience_years": "5",
  "career_stage": "MID",
  "industry": "Technology",
  "linkedin_url": "https://linkedin.com/in/priya",
  "employability_score": 6.4,
  "score_band": "Needs Optimization",
  "lead_priority": "HIGH",
  "tags": ["HIGH_PAIN_LEAD", "CONSULTATION_PRIORITY"],
  "payment_status": "COMPLETED",
  "report_status": "GENERATED",
  "consultation_status": "NONE",
  "trigger_event": "REPORT_GENERATED",
  "event_timestamp": "2024-01-15T10:30:00Z",
  "candidate_created_at": "2024-01-15T10:00:00Z",
  "idempotency_key": "QS-2024-ABCD::crm::REPORT_GENERATED",
  "source": "qualscore_diagnostic"
}
```

### Environment Variables (CRM)

| Variable | Required | Description |
|----------|----------|-------------|
| `CRM_PROVIDER` | No | `stub` (default) or `webhook` |
| `CRM_ENABLED` | No | `true` (default) — set `false` to disable all CRM pushes |
| `CRM_WEBHOOK_URL` | For webhook | Full HTTPS URL of the receiving endpoint |
| `CRM_WEBHOOK_SECRET` | No | Sent as `Authorization: Bearer <secret>` |
| `CRM_WEBHOOK_AUTH_HEADER` | No | Override auth header name (default: `Authorization`) |
| `CRM_WEBHOOK_AUTH_PREFIX` | No | Override auth value prefix (default: `Bearer `) |
| `CRM_TIMEOUT_SECONDS` | No | HTTP read timeout (default: `10`) |
| `CRM_MAX_RETRIES` | No | Retry count on 429/5xx (default: `2`) |

### Webhook Compatibility

The `WebhookCrmProvider` works out-of-the-box with:

| Platform | How to set up |
|----------|--------------|
| **Zapier** | Create "Webhooks by Zapier" trigger (Catch Hook) → map fields to CRM action |
| **Make (Integromat)** | Create a Webhook module → connect to HubSpot/Zoho/Salesforce module |
| **n8n** | Webhook node → HTTP Request or CRM node |
| **HubSpot** | Operations Hub → Custom Webhook Trigger → match on `candidate_reference` |
| **Zoho CRM** | Zoho Flow → Webhook trigger → Create/Update Lead |
| **Internal CRM** | Any REST endpoint accepting `Content-Type: application/json` POST |

### Adding a Native CRM Provider (e.g. HubSpot SDK)

1. Create `HubSpotCrmProvider implements CrmProvider` in `crm/` package
2. Add HubSpot-specific properties to `CrmProperties` (e.g. `portalId`, `pipelineId`)
3. Map `CrmPushRequest.payload()` fields → HubSpot Contact + Deal properties:
   ```
   email              → hs_email
   full_name          → firstname + lastname (split on first space)
   mobile_number      → phone
   employability_score → custom property: qualscore_score
   score_band         → custom property: qualscore_band
   lead_priority      → hs_lead_status
   tags               → custom property: qualscore_tags (JSON string)
   ```
4. Add a `case "hubspot"` branch in `CrmProviderConfig.crmProvider()`
5. Set `CRM_PROVIDER=hubspot` and the HubSpot env vars

### Idempotency

Idempotency key: `candidateCode::crm::eventType`
- `SENT` / `DELIVERED` → skip
- `PENDING` → skip (in-flight)
- `FAILED` → retry on next trigger

### Retry Behaviour

- HTTP 429 and 5xx → up to `CRM_MAX_RETRIES` retries with 2-second backoff
- HTTP 4xx (except 429) → no retry (configuration or payload error)
- Network timeout / connection error → retry

### Failure Isolation

CRM push failures are caught inside `CrmNotificationService`. They:
- Set the `communication_events` row to `FAILED` with the error message
- Log at ERROR level
- **Never propagate** to the diagnostic, report, or booking transaction

---

## WhatsApp Integration (Meta Cloud API)

### Architecture

```
AutomationTriggerServiceImpl
  └─► CommunicationEventService.dispatchWhatsApp(...)
        └─► WhatsAppNotificationService
              ├─ Idempotency check (communication_events.idempotency_key)
              ├─ Persist PENDING row
              ├─► WhatsAppProvider (interface)
              │     ├─ MetaCloudWhatsAppProvider  (when credentials set)
              │     └─ StubWhatsAppProvider       (when no credentials)
              └─ Update row to SENT | FAILED
```

Delivery status updates arrive via the Meta webhook:

```
Meta → POST /api/webhooks/whatsapp → WhatsAppWebhookController
          └─ Updates communication_events.delivery_status to DELIVERED | FAILED
```

### Provider Selection

The provider is chosen at startup based on whether credentials are present:

| Condition | Provider selected |
|-----------|------------------|
| `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` both set | `MetaCloudWhatsAppProvider` |
| Either credential missing | `StubWhatsAppProvider` (safe dev mode) |

The active provider is logged at startup:
```
[WhatsApp] Provider: meta-cloud | phoneNumberId=... | apiVersion=v19.0
[WhatsApp] Provider: stub (no credentials configured)
```

### Messages sent

| Event | Template | Content |
|-------|----------|---------|
| `REPORT_GENERATED` | `WA_REPORT_READY` | "Hi [NAME], your Employability Diagnostic Report is ready. Your Score: [SCORE]/10…" |
| `REPORT_VIEWED` | `WA_CONSULTATION_NUDGE` | "Based on your report, a few key gaps are likely affecting your interview calls. Book a quick consultation: [LINK]" |
| `CONSULTATION_BOOKED` | `WA_BOOKING_CONFIRMED` | "Hi [NAME], your consultation is confirmed. Booking Ref: [REF] / Date: [DATE] / Time: [TIME]…" |

### Environment Variables (WhatsApp)

| Variable | Required | Description |
|----------|----------|-------------|
| `WHATSAPP_PROVIDER` | No | `stub` (default) or `meta` |
| `WHATSAPP_ACCESS_TOKEN` | For Meta | Permanent system-user access token from Meta Business Manager |
| `WHATSAPP_PHONE_NUMBER_ID` | For Meta | Numeric Phone Number ID from Meta → WhatsApp → API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | For Meta | Meta Business Account (WABA) ID |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | For webhooks | Secret string matching what you set in Meta webhook config |
| `WHATSAPP_API_VERSION` | No | Graph API version (default: `v19.0`) |
| `WHATSAPP_TIMEOUT_SECONDS` | No | HTTP read timeout (default: `15`) |
| `WHATSAPP_MAX_RETRIES` | No | Retry count on transient errors (default: `2`) |

### Setting up Meta WhatsApp Business Cloud API

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com) with the **WhatsApp** product added.
2. In **WhatsApp → API Setup**, note your **Phone Number ID** and **WABA ID**.
3. Generate a **permanent system-user access token** (not a short-lived user token):
   - Meta Business Manager → Settings → System Users → Add → Generate Token
   - Grant scopes: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Create and get approved **message templates** in Meta Business Manager → Message Templates:
   - Template names used: `wa_report_ready`, `wa_consultation_nudge`, `wa_booking_confirmed`
   - Template category: **UTILITY** (transactional)
   - Language: `en`
5. Configure the webhook in Meta → WhatsApp → Configuration → Webhooks:
   - Callback URL: `https://api.qualscore.in/api/webhooks/whatsapp`
   - Verify Token: same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to: `messages` (status updates: sent, delivered, read, failed)
6. Set the 4 env vars and restart the service.

### Idempotency

Each WhatsApp send is guarded by an idempotency key: `candidateCode::templateCode`. Before sending:
- If a row exists with status `SENT` or `DELIVERED` → skip (no duplicate send)
- If a row exists with status `PENDING` → skip (in-flight)
- If a row exists with status `FAILED` → retry

### Delivery Status Flow

```
(send attempt)   → PENDING → SENT   (Meta API accepted)
                           → FAILED  (Meta rejected / network timeout)
(webhook callback)         → DELIVERED (Meta confirmed delivery to device)
                           → FAILED    (delivery failed at network level)
```

---

## Security

- **Public endpoints:** payment, lead creation, diagnostic, analysis, report, booking, analytics
- **Protected endpoints:** `/api/admin/**` requires a valid Bearer JWT
- JWT is verified using `JwtService` (HMAC-SHA256)
- Compatible with Supabase-issued JWTs (role extracted from `app_metadata.role`)
- CSRF disabled (stateless REST API)
- CORS configured via `CORS_ALLOWED_ORIGINS` env var

---

## Database Schema

Schema is managed via Supabase migrations in `../supabase/migrations/`. JPA is set to `validate` mode — it verifies entity mappings against the existing schema without modifying it.

Tables:
- `leads` — candidate profile + payment status + final score
- `diagnostic_sessions` — 15 answers + computed scores (JSONB)
- `reports` — generated report data (JSONB)
- `consultations` — booking slots + booking reference
- `analytics_events` — immutable append-only funnel events

---

## Next Steps (Phase Roadmap)

- [ ] **Phase 1** — Wire Razorpay SDK for real payment verification
- [ ] **Phase 2** — Wire Proxycurl + OpenAI for live LinkedIn analysis and LLM reports
- [x] **Phase 3** — Wire WhatsApp + Email notification triggers post-report and post-booking (Meta Cloud API + Resend)
- [x] **Phase 4** — Wire CRM sync via generic webhook provider (HubSpot/Zoho/custom ready)
- [ ] **Phase 5** — Wire Calendly for automated booking slot management
- [ ] **Phase 6** — Add rate limiting (Bucket4j), caching (Redis), and async event publishing
- [ ] **Phase 7** — Add comprehensive unit and integration tests

---

## Contributing

Follow the existing layered architecture:
- Controllers are thin — no business logic
- Services own all business logic
- Repositories own all data access
- Client classes own all external API calls (network boundary)
- DTOs are immutable where possible (use `@Builder`)
- All exceptions extend `BusinessException` and are handled by `GlobalExceptionHandler`
