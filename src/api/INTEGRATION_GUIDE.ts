/**
 * ─────────────────────────────────────────────────────────────────────────────
 * QUALSCORE — FRONTEND ↔ BACKEND INTEGRATION GUIDE
 *
 * Backend:   Java 21 / Spring Boot 3 — com.qualscore.qualcore
 * Frontend:  React 18 / Vite / TypeScript
 * API Base:  VITE_API_BASE_URL (default: http://localhost:8080)
 *
 * Key files:
 *   src/api/contracts.ts       — All TypeScript request/response types
 *   src/api/client.ts          — HTTP client (backend* functions) + legacy stubs (api*)
 *   backend/.../controller/v1/ — Java Spring Boot v1 controllers
 *   backend/.../dto/           — Java DTOs (source of truth for contracts.ts)
 *
 * Response envelope (all endpoints):
 *   Success:  { "ok": true,  "data": { ... } }
 *   Failure:  { "ok": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }
 *
 * Correlation:
 *   Every response includes X-Request-Id header (echoed in body as requestId on errors).
 *   Include this ID in any bug reports or support tickets.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION A — COMPLETE ENDPOINT LIST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── PAYMENT ──────────────────────────────────────────────────────────────
 *
 *   POST   /api/v1/payments/initiate       Create gateway order
 *   POST   /api/v1/payments/verify         Verify payment signature
 *   POST   /api/v1/payments/webhook        Receive gateway webhook (server-to-server)
 *
 * ── CANDIDATES ───────────────────────────────────────────────────────────
 *
 *   POST   /api/v1/candidates/profile      Create candidate profile (requires paymentReference)
 *
 * ── DIAGNOSTIC ───────────────────────────────────────────────────────────
 *
 *   GET    /api/v1/diagnostic/questions                         Fetch all 15 questions
 *   POST   /api/v1/diagnostic/submit                            Submit 15 answers
 *   POST   /api/v1/diagnostic/analyze/{candidateReference}      Run full analysis pipeline
 *
 * ── REPORTS ──────────────────────────────────────────────────────────────
 *
 *   GET    /api/v1/reports/{candidateReference}                 Fetch generated report
 *
 * ── CONSULTATIONS ────────────────────────────────────────────────────────
 *
 *   POST   /api/v1/consultations                                Book a consultation slot
 *   GET    /api/v1/consultations/{candidateReference}           Fetch all bookings for candidate
 *
 * ── ADMIN  (Bearer JWT required — ROLE_ADMIN) ────────────────────────────
 *
 *   GET    /api/v1/admin/leads                                  Paginated lead list
 *   GET    /api/v1/admin/leads/{candidateReference}             Single lead detail
 *
 * ── SYSTEM ───────────────────────────────────────────────────────────────
 *
 *   GET    /api/system/version                                  Version info (no auth)
 *   GET    /actuator/health                                     Health check (no auth)
 *
 * ── SWAGGER UI ───────────────────────────────────────────────────────────
 *
 *   GET    /swagger-ui.html                                     Interactive API docs
 *   GET    /v3/api-docs                                         OpenAPI JSON
 *
 *   Groups available in Swagger UI:
 *     "1-public"  — Candidate funnel endpoints (no auth)
 *     "2-admin"   — Admin endpoints (bearerAuth required)
 *     "3-legacy"  — Pre-v1 legacy endpoints
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION B — END-TO-END FRONTEND CALL SEQUENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All `backend*` functions live in src/api/client.ts.
 * Import them:  import { backendInitiatePayment, ... } from '../api/client';
 *
 *
 * ── STEP 1: Initiate Payment ──────────────────────────────────────────────
 *
 *   Called from: CheckoutPage
 *   Function:    backendInitiatePayment(req)
 *   Endpoint:    POST /api/v1/payments/initiate
 *
 *   REQUEST:
 *   {
 *     "candidateName": "Priya Sharma",
 *     "email": "priya@example.com",
 *     "amountPaise": 19900,
 *     "currency": "INR"
 *   }
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": {
 *       "paymentReference": "PAY-A1B2C3D4",
 *       "gatewayOrderId": "order_OdXlmNopQrSt",
 *       "amountPaise": 19900,
 *       "currency": "INR",
 *       "keyId": "rzp_live_xxxxxxxxxxxxx",
 *       "createdAt": "2026-03-28T10:00:00Z"
 *     }
 *   }
 *
 *   AFTER STEP 1:
 *     Store paymentReference in FlowContext.
 *     Open Razorpay modal:
 *       options.key = data.keyId
 *       options.order_id = data.gatewayOrderId
 *       options.amount = data.amountPaise
 *       options.handler = (response) => callStep2(response)
 *
 *
 * ── STEP 2: Verify Payment ────────────────────────────────────────────────
 *
 *   Called from: Razorpay success handler (inside CheckoutPage)
 *   Function:    backendVerifyPayment(req)
 *   Endpoint:    POST /api/v1/payments/verify
 *
 *   REQUEST (from Razorpay handler callback):
 *   {
 *     "gatewayOrderId": "order_OdXlmNopQrSt",
 *     "gatewayPaymentId": "pay_OdXlmNopQrSt",
 *     "gatewaySignature": "3d0e43b2f..."
 *   }
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": {
 *       "verified": true,
 *       "paymentReference": "PAY-A1B2C3D4",
 *       "gatewayOrderId": "order_OdXlmNopQrSt",
 *       "gatewayPaymentId": "pay_OdXlmNopQrSt",
 *       "status": "VERIFIED",
 *       "verifiedAt": "2026-03-28T10:01:00Z"
 *     }
 *   }
 *
 *   AFTER STEP 2:
 *     If verified=true → store paymentReference, navigate to CandidateFormPage.
 *     If verified=false or error → show payment failure screen.
 *
 *
 * ── STEP 3: Save Candidate Profile ───────────────────────────────────────
 *
 *   Called from: CandidateFormPage on form submit
 *   Function:    backendSaveCandidateProfile(req)
 *   Endpoint:    POST /api/v1/candidates/profile  → HTTP 201
 *
 *   REQUEST:
 *   {
 *     "fullName": "Priya Sharma",
 *     "email": "priya@example.com",
 *     "mobileNumber": "+919876543210",
 *     "location": "Bengaluru",
 *     "currentRole": "Senior Software Engineer",
 *     "careerStage": "WORKING_PROFESSIONAL",
 *     "industry": "Technology",
 *     "linkedinUrl": "https://www.linkedin.com/in/priyasharma",
 *     "paymentReference": "PAY-A1B2C3D4"
 *   }
 *
 *   RESPONSE (201 Created):
 *   {
 *     "ok": true,
 *     "data": {
 *       "candidateCode": "CND-X7Y8Z9",
 *       "fullName": "Priya Sharma",
 *       "email": "priya@example.com",
 *       "careerStage": "WORKING_PROFESSIONAL",
 *       "industry": "Technology",
 *       "linkedinUrl": "https://www.linkedin.com/in/priyasharma",
 *       "createdAt": "2026-03-28T10:02:00Z"
 *     }
 *   }
 *
 *   AFTER STEP 3:
 *     Store candidateCode in FlowContext — this is your identity token for all steps below.
 *     Navigate to DiagnosticPage.
 *
 *   VALIDATION RULES:
 *     careerStage:   must be "FRESHER" or "WORKING_PROFESSIONAL" (uppercase enum)
 *     mobileNumber:  matches ^(\+91)?[6-9]\d{9}$ (Indian mobile format)
 *     linkedinUrl:   must start with https://www.linkedin.com/in/
 *     paymentReference must exist and be in VERIFIED or SUCCESS state
 *
 *
 * ── STEP 4a: Fetch Questions (optional) ──────────────────────────────────
 *
 *   Called from: DiagnosticPage (on mount, if not cached)
 *   Function:    backendGetDiagnosticQuestions()
 *   Endpoint:    GET /api/v1/diagnostic/questions
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": [
 *       {
 *         "code": "Q01",
 *         "sequence": 1,
 *         "sectionCode": "CAREER_DIRECTION",
 *         "sectionLabel": "Career Direction",
 *         "text": "Which role are you actively targeting right now?",
 *         "options": [
 *           { "code": "same_role",     "label": "Same as my current or most recent role" },
 *           { "code": "advanced_role", "label": "A slightly advanced version of my current role" },
 *           { "code": "different_role","label": "A different role within the same domain" },
 *           { "code": "exploring",     "label": "I am still exploring multiple unrelated roles" }
 *         ]
 *       },
 *       ... (15 questions total, Q01–Q15)
 *     ]
 *   }
 *
 *   NOTE: The option codes returned here (same_role, advanced_role, etc.) are the
 *         optionCode values you must send in Step 4b. Do not send numeric indices.
 *
 *   ALTERNATIVE: The questions are static — you can use src/constants/questions.ts
 *     directly and map frontend question IDs to backend codes using:
 *     questionCode = `Q${String(questionId).padStart(2, '0')}` (Q01, Q02, ... Q15)
 *
 *
 * ── STEP 4b: Submit Diagnostic Answers ───────────────────────────────────
 *
 *   Called from: DiagnosticPage on final question answer
 *   Function:    backendSubmitDiagnostic(req)
 *   Endpoint:    POST /api/v1/diagnostic/submit
 *
 *   REQUEST:
 *   {
 *     "candidateCode": "CND-X7Y8Z9",
 *     "answers": [
 *       { "questionCode": "Q01", "optionCode": "advanced_role" },
 *       { "questionCode": "Q02", "optionCode": "growth" },
 *       { "questionCode": "Q03", "optionCode": "profile_weak" },
 *       { "questionCode": "Q04", "optionCode": "8_to_14" },
 *       { "questionCode": "Q05", "optionCode": "both_channels" },
 *       { "questionCode": "Q06", "optionCode": "selective_followup" },
 *       { "questionCode": "Q07", "optionCode": "mostly_ready" },
 *       { "questionCode": "Q08", "optionCode": "partial_proof" },
 *       { "questionCode": "Q09", "optionCode": "fairly_clearly" },
 *       { "questionCode": "Q10", "optionCode": "hybrid_remote" },
 *       { "questionCode": "Q11", "optionCode": "maybe_relocate" },
 *       { "questionCode": "Q12", "optionCode": "realistic" },
 *       { "questionCode": "Q13", "optionCode": "profile_positioning" },
 *       { "questionCode": "Q14", "optionCode": "somewhat_actively" },
 *       { "questionCode": "Q15", "optionCode": "book_eval" }
 *     ]
 *   }
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": {
 *       "sessionId": "sess_abc123",
 *       "answersRecorded": 15,
 *       "savedAt": "2026-03-28T10:05:00Z"
 *     }
 *   }
 *
 *   IMPORTANT:
 *     Do NOT send scores — backend ignores them and assigns authoritative scores.
 *     All 15 questions (Q01–Q15) must be answered. Partial submissions are rejected.
 *
 *
 * ── STEP 5: Trigger Analysis ──────────────────────────────────────────────
 *
 *   Called from: AnalysisPage on mount
 *   Function:    backendTriggerAnalysis(candidateCode, { forceRecalculate: false })
 *   Endpoint:    POST /api/v1/diagnostic/analyze/{candidateReference}
 *
 *   REQUEST:
 *   {
 *     "forceRecalculate": false
 *   }
 *
 *   RESPONSE (200 OK — analysis complete):
 *   {
 *     "ok": true,
 *     "data": {
 *       "candidateCode": "CND-X7Y8Z9",
 *       "careerDirectionScore": 7.5,
 *       "jobSearchBehaviorScore": 6.8,
 *       "opportunityReadinessScore": 8.2,
 *       "flexibilityConstraintsScore": 7.0,
 *       "improvementIntentScore": 9.0,
 *       "linkedinScore": 72.5,
 *       "finalEmployabilityScore": 74.2,
 *       "bandLabel": "Strong",
 *       "tags": ["warm_lead", "high_intent", "profile_positioning"],
 *       "reportGenerated": true,
 *       "linkedinAnalyzed": true,
 *       "isMockLinkedIn": false,
 *       "analyzedAt": "2026-03-28T10:06:30Z"
 *     }
 *   }
 *
 *   TIMING: This call may take 5–30 seconds (LLM + Proxycurl).
 *           Show a loading / progress animation on AnalysisPage.
 *           If reportGenerated=true, immediately call Step 6.
 *
 *
 * ── STEP 6: Fetch Report ──────────────────────────────────────────────────
 *
 *   Called from: ReportPage on mount
 *   Function:    backendFetchReport(candidateCode)
 *   Endpoint:    GET /api/v1/reports/{candidateReference}
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": {
 *       "id": "550e8400-...",
 *       "candidateCode": "CND-X7Y8Z9",
 *       "reportTitle": "Employability Diagnostic Report — Priya Sharma",
 *       "scoreSummary": {
 *         "finalEmployabilityScore": 74.2,
 *         "bandLabel": "Strong"
 *       },
 *       "linkedinInsight": "Your LinkedIn headline clearly communicates...",
 *       "behavioralInsight": "Your job search strategy shows...",
 *       "dimensionBreakdown": [
 *         { "sectionCode": "CAREER_DIRECTION", "sectionLabel": "Career Direction", "score": 7.5, "maxScore": 10, "percentage": 75 },
 *         ...
 *       ],
 *       "topGaps": [
 *         { "title": "Proof of Work", "description": "Your visible proof...", "severity": "medium" }
 *       ],
 *       "riskProjection": "At your current trajectory, you are likely...",
 *       "recommendation": "Focus on building a portfolio...",
 *       "recruiterViewInsight": "Recruiters viewing your profile would see...",
 *       "ctaHeadline": "Ready to fast-track your job search?",
 *       "ctaBody": "Book a personalised strategy session...",
 *       "ctaButtonText": "Book Free Consultation",
 *       "reportStatus": "COMPLETED",
 *       "createdAt": "2026-03-28T10:06:30Z",
 *       "updatedAt": "2026-03-28T10:06:30Z"
 *     }
 *   }
 *
 *   IF reportStatus = "GENERATING":
 *     Poll every 3–5 seconds until status = "COMPLETED".
 *     Maximum 10 retries before showing a "Report generation in progress" message.
 *
 *
 * ── STEP 7: Book Consultation ─────────────────────────────────────────────
 *
 *   Called from: BookingPage on form submit
 *   Function:    backendBookConsultation(req)
 *   Endpoint:    POST /api/v1/consultations  → HTTP 201
 *
 *   REQUEST:
 *   {
 *     "candidateReference": "CND-X7Y8Z9",
 *     "preferredDate": "2026-04-10",
 *     "preferredTime": "10:00 AM",
 *     "notes": "I want to focus on LinkedIn optimisation"
 *   }
 *
 *   RESPONSE (201 Created):
 *   {
 *     "ok": true,
 *     "data": {
 *       "bookingId": "BOOK-123456",
 *       "candidateReference": "CND-X7Y8Z9",
 *       "preferredDate": "2026-04-10",
 *       "preferredTime": "10:00 AM",
 *       "notes": "I want to focus on LinkedIn optimisation",
 *       "bookingStatus": "REQUESTED",
 *       "createdAt": "2026-03-28T10:10:00Z",
 *       "updatedAt": "2026-03-28T10:10:00Z"
 *     }
 *   }
 *
 *   ERROR — DUPLICATE BOOKING (HTTP 409):
 *   {
 *     "ok": false,
 *     "error": { "code": "CONFLICT", "message": "An active booking already exists for this candidate." },
 *     "requestId": "a1b2c3d4"
 *   }
 *
 *
 * ── STEP 8: Admin Fetch Leads ─────────────────────────────────────────────
 *
 *   Called from: AdminPage
 *   Function:    backendFetchAdminLeads(req, adminToken)
 *   Endpoint:    GET /api/v1/admin/leads?limit=50&offset=0&filter=all
 *
 *   HEADERS:  Authorization: Bearer <admin-jwt-token>
 *
 *   RESPONSE (200 OK):
 *   {
 *     "ok": true,
 *     "data": {
 *       "leads": [
 *         {
 *           "candidateReference": "CND-X7Y8Z9",
 *           "fullName": "Priya Sharma",
 *           "mobileNumber": "+919876543210",
 *           "email": "priya@example.com",
 *           "currentRole": "Senior Software Engineer",
 *           "totalExperienceYears": "5",
 *           "careerStage": "WORKING_PROFESSIONAL",
 *           "industry": "Technology",
 *           "linkedinUrl": "https://www.linkedin.com/in/priyasharma",
 *           "finalEmployabilityScore": 74.2,
 *           "bandLabel": "Strong",
 *           "tags": ["warm_lead", "high_intent"],
 *           "leadPriority": "HIGH",
 *           "consultationStatus": "REQUESTED",
 *           "paymentStatus": "VERIFIED",
 *           "reportStatus": "COMPLETED",
 *           "createdAt": "2026-03-28T10:00:00Z"
 *         }
 *       ],
 *       "total": 1,
 *       "hasMore": false,
 *       "fetchedAt": "2026-03-28T10:15:00Z"
 *     }
 *   }
 *
 *   FILTER VALUES:
 *     "all"      — All leads (default)
 *     "high"     — HIGH priority leads
 *     "medium"   — MEDIUM priority leads
 *     "reported" — Leads with a COMPLETED report
 *     "booked"   — Leads with a consultation booking
 *
 *   ADMIN TOKEN:
 *     Generate via JwtService.generateToken("admin@qualscore.in", "ADMIN")
 *     from the Java backend (dev only).
 *     In production: implement admin login endpoint or use Supabase auth.
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION C — COMMON ERROR CASES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * HTTP 400 — Validation failure:
 *   {
 *     "ok": false,
 *     "error": {
 *       "code": "VALIDATION_ERROR",
 *       "message": "Request validation failed",
 *       "details": [
 *         { "field": "mobileNumber", "message": "Mobile number format is invalid" },
 *         { "field": "careerStage",  "message": "Career stage is required" }
 *       ]
 *     },
 *     "requestId": "a1b2c3d4"
 *   }
 *   → Map details[] to inline field errors in the form UI.
 *
 * HTTP 404 — Resource not found:
 *   {
 *     "ok": false,
 *     "error": { "code": "NOT_FOUND", "message": "Candidate CND-X7Y8Z9 not found." },
 *     "requestId": "a1b2c3d4"
 *   }
 *   → Show appropriate not-found state (e.g. "Report not ready yet").
 *
 * HTTP 409 — Conflict (duplicate booking, already-verified payment):
 *   {
 *     "ok": false,
 *     "error": { "code": "CONFLICT", "message": "An active booking already exists." },
 *     "requestId": "a1b2c3d4"
 *   }
 *   → For duplicate booking: show success state (booking already exists is fine).
 *   → For already-verified payment: treat as success, proceed to next step.
 *
 * HTTP 422 — Payment verification failure:
 *   {
 *     "ok": false,
 *     "error": { "code": "PAYMENT_VERIFICATION_FAILED", "message": "Signature mismatch." },
 *     "requestId": "a1b2c3d4"
 *   }
 *   → Show payment failure page with retry option.
 *
 * HTTP 429 — Rate limited:
 *   Headers: Retry-After: 60
 *   { "ok": false, "error": { "code": "RATE_LIMITED", "message": "Too many requests." } }
 *   → Back off and retry after 60 seconds. Show user a friendly wait message.
 *
 * HTTP 500 — Server error:
 *   {
 *     "ok": false,
 *     "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred. Reference: a1b2c3d4" },
 *     "requestId": "a1b2c3d4"
 *   }
 *   → Show generic error. Log requestId for support escalation.
 *
 * Network error (fetch throws):
 *   { ok: false, error: { code: "NETWORK_ERROR", message: "Could not reach the backend: ..." } }
 *   → Show "Connection error" banner. Check VITE_API_BASE_URL and CORS config.
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION D — CORS CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend CORS is configured in SecurityConfig.java.
 * Allowed origins (configurable via CORS_ALLOWED_ORIGINS env var):
 *   http://localhost:5173  (Vite dev server)
 *   http://localhost:3000
 *   http://localhost:4173  (Vite preview)
 *   https://qualscore.in   (add production domain here)
 *
 * Allowed headers:
 *   Authorization, Content-Type, Accept, X-Request-Id, X-Correlation-Id
 *
 * Exposed headers:
 *   X-Request-Id
 *
 * To add the production domain:
 *   Set env var: CORS_ALLOWED_ORIGINS=https://qualscore.in,https://www.qualscore.in
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION E — ENVIRONMENT VARIABLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── FRONTEND (.env / deployment platform) ────────────────────────────────
 *
 *   VITE_SUPABASE_URL           Supabase project URL
 *   VITE_SUPABASE_ANON_KEY      Supabase anon key (public — safe to expose)
 *   VITE_API_BASE_URL           Java backend base URL (default: http://localhost:8080)
 *   VITE_RAZORPAY_KEY_ID        Razorpay public Key ID (rzp_live_xxx or rzp_test_xxx)
 *                               Safe to commit for test keys; never commit live keys.
 *                               Leave blank to use mock mode (no Razorpay modal).
 *
 * ── BACKEND (environment variables — never commit secrets) ───────────────
 *
 *   DB_URL                         PostgreSQL connection URL
 *   DB_USERNAME / DB_PASSWORD       Database credentials
 *   JWT_SECRET                      JWT signing secret (256-bit+)
 *   CORS_ALLOWED_ORIGINS            Frontend origin(s), comma-separated
 *
 *   ── Payment gateway ──────────────────────────────────────────────────
 *   INTEGRATIONS_PAYMENT_PROVIDER   mock | razorpay | payu (default: mock)
 *   RAZORPAY_KEY_ID                 Same as VITE_RAZORPAY_KEY_ID (used for order API calls)
 *   RAZORPAY_KEY_SECRET             Razorpay Key Secret (NEVER in frontend or source control)
 *   RAZORPAY_WEBHOOK_SECRET         Webhook signing secret from Razorpay Dashboard
 *
 *   ── Other integrations ───────────────────────────────────────────────
 *   OPENAI_API_KEY                  OpenAI API key for LLM report generation
 *   PROXYCURL_API_KEY               Proxycurl API key for LinkedIn profile scraping
 *   RATE_LIMIT_ENABLED              Enable rate limiting (default: false)
 *   RATE_LIMIT_PUBLIC_RPM           Public endpoint RPM limit (default: 60)
 *   RATE_LIMIT_ADMIN_RPM            Admin endpoint RPM limit (default: 120)
 *
 * ── RAZORPAY ACTIVATION CHECKLIST ────────────────────────────────────────
 *
 *   Backend:
 *     1. Set INTEGRATIONS_PAYMENT_PROVIDER=razorpay
 *     2. Set RAZORPAY_KEY_ID=rzp_live_xxxx (or rzp_test_xxxx)
 *     3. Set RAZORPAY_KEY_SECRET=xxxx (keep secret — only on server)
 *     4. Set RAZORPAY_WEBHOOK_SECRET=xxxx (generate in Razorpay Dashboard)
 *     5. In Razorpay Dashboard → Webhooks → Add:
 *          URL:    https://api.qualscore.in/api/v1/payments/webhook
 *          Events: payment.captured
 *          Secret: same value as RAZORPAY_WEBHOOK_SECRET
 *
 *   Frontend:
 *     6. Set VITE_RAZORPAY_KEY_ID=rzp_live_xxxx (same key ID, public)
 *        The Razorpay checkout.js SDK is loaded dynamically when this is set.
 *
 *   Test mode (no real card charges):
 *     Use rzp_test_xxxx keys. Razorpay provides test card numbers at:
 *     https://razorpay.com/docs/payments/payments/test-card-upi-details/
 *
 * ── MOCK MODE (default — no Razorpay account needed) ─────────────────────
 *
 *   Leave INTEGRATIONS_PAYMENT_PROVIDER unset (defaults to "mock").
 *   Leave VITE_RAZORPAY_KEY_ID blank.
 *   The frontend will skip the Razorpay modal and simulate a payment using
 *   a synthetic btoa signature. The backend MockPaymentGatewayClient always
 *   returns verified=true. Full diagnostic flow works end-to-end in mock mode.
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION F — LOADING STATE PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All backend* functions are async and return ApiResponse<T>.
 * Recommended loading state pattern:
 *
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 *
 *   async function handleSubmit() {
 *     setLoading(true);
 *     setError(null);
 *     const res = await backendSaveCandidateProfile(req);
 *     setLoading(false);
 *     if (!res.ok) {
 *       setError(res.error.message);
 *       return;
 *     }
 *     // use res.data
 *   }
 *
 * For Step 5 (analysis — long-running):
 *
 *   Show animated progress: "Analyzing your profile...", "Running LinkedIn analysis...",
 *   "Calculating your score...", "Generating your report..."
 *   After triggerAnalysis() returns, poll getAnalysisStatus(candidateCode) every 3 seconds.
 *   Terminal states: COMPLETED, FAILED. Max poll duration: 120 seconds.
 *   If COMPLETED is returned immediately in the triggerAnalysis response, skip polling.
 *   On timeout: show "taking longer than expected" with a retry button.
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION G — MIGRATION CHECKLIST (legacy → backend)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * To migrate each page from the legacy stub (api*) to the real backend (backend*):
 *
 *   CheckoutPage.tsx
 *     [ ] Replace apiInitiatePayment() → backendInitiatePayment()
 *         Shape change: orderId → gatewayOrderId, new field: paymentReference
 *     [ ] Replace apiVerifyPayment()   → backendVerifyPayment()
 *         Shape change: razorpayOrderId → gatewayOrderId, paymentId → gatewayPaymentId
 *     [ ] Store paymentReference (not orderId) in FlowContext after verify
 *
 *   CandidateFormPage.tsx
 *     [ ] Replace apiSaveCandidateProfile() → backendSaveCandidateProfile()
 *         Shape change: candidateDetails{} → flat fields, new field: paymentReference
 *         careerStage mapping: 'fresher' → 'FRESHER', 'working_professional' → 'WORKING_PROFESSIONAL'
 *     [ ] Store candidateCode (not leadId) in FlowContext after create
 *
 *   DiagnosticPage.tsx
 *     [ ] Replace apiSaveDiagnosticResponses() → backendSubmitDiagnostic()
 *         Shape change: answers[]{questionId, value, score, category} → answers[]{questionCode, optionCode}
 *         questionCode mapping: Q01 = questionId 1, Q02 = questionId 2, ... Q15 = questionId 15
 *
 *   AnalysisPage.tsx
 *     [ ] Remove apiCalculateDiagnosticResult() + apiAnalyzeLinkedInProfile()
 *     [ ] Replace with single call: backendTriggerAnalysis(candidateCode)
 *     [ ] Map TriggerAnalysisResponse fields to FlowContext evaluation shape
 *
 *   ReportPage.tsx
 *     [ ] Remove apiGenerateReport()
 *     [ ] Replace with: backendFetchReport(candidateCode)
 *     [ ] Map FetchReportResponse to existing ReportData/FinalScore shapes
 *         or update report components to consume FetchReportResponse directly
 *
 *   BookingPage.tsx
 *     [ ] Replace apiBookConsultation() → backendBookConsultation()
 *         Shape change: leadId/sessionId → candidateReference only
 *
 *   AdminPage.tsx
 *     [ ] Replace apiFetchAdminLeads() → backendFetchAdminLeads(req, adminToken)
 *         Requires admin JWT token — implement admin auth flow first
 *         Shape change: AdminLeadRecordLegacy{} → AdminLeadRecord{candidateReference, ...}
 *
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECTION H — CANDIDATE CODE vs LEAD ID
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The frontend currently uses leadId (UUID from Supabase leads table) as the
 * candidate identity token.
 *
 * The backend issues candidateCode (e.g. CND-X7Y8Z9) as the candidate token.
 * candidateCode maps to candidate_code in the Java backend's CandidateProfile entity.
 *
 * During migration:
 *   - FlowContext.leadId → should be replaced with FlowContext.candidateCode
 *   - All backendXxx() calls use candidateCode (string "CND-...")
 *   - All apiXxx() legacy stubs use leadId (UUID string)
 *
 * The two systems are separate: Supabase stores leads for the frontend,
 * the Java backend stores CandidateProfiles with their own candidate_code.
 * After full migration, the Supabase-based lead management will be removed.
 */

export {};
