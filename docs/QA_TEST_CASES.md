# QualScore — QA / UAT Test Cases

Structured test cases for the full user journey. Run before every staging deploy and before production go-live.

**Test environments:**
- Staging: `https://staging.qualscore.in` + `https://api-staging.qualscore.in`
- Production smoke: `https://qualscore.in` + `https://api.qualscore.in`

**Notation:**
- `PASS` / `FAIL` / `SKIP` (mark each row when executing)
- `[BE]` = requires backend verification (DB, logs)
- `[FE]` = frontend-only observable

---

## TC-01 — Payment Success Flow

**Preconditions:** Backend running, Razorpay test keys configured, `INTEGRATIONS_PAYMENT_PROVIDER=razorpay` or `mock`

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 1.1 | Open `/` (landing page) | Page loads, CTA visible, no console errors | |
| 1.2 | Click primary CTA | Navigates to `/checkout` | |
| 1.3 | Click "Pay ₹199" | Payment stage changes to `initiating`; Razorpay modal opens | |
| 1.4 | Complete payment in Razorpay modal (use test card: `4111 1111 1111 1111`) | Modal closes; stage changes to `verifying` | |
| 1.5 | Verification completes | Stage → `success`; auto-redirect to `/details` within 1.5s | |
| 1.6 | `[BE]` Check DB: `candidate_profiles` or `leads` row created | Payment ref stored, status = `COMPLETED` | |
| 1.7 | `[BE]` Check backend log | `payment.captured` event logged with order ID | |
| 1.8 | `[FE]` Refresh `/details` after payment | Still on `/details` (state hydrated from localStorage) | |

**Analytics events expected:** `payment_started`, `payment_success`

---

## TC-02 — Payment Failure Flow

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 2.1 | Open `/checkout`, click "Pay" | Razorpay modal opens | |
| 2.2 | Close modal without paying (click X) | Error message shown: "Payment was cancelled — no charge was made" | |
| 2.3 | Button resets to `Try again` state | User can retry without reloading | |
| 2.4 | Use Razorpay test card that triggers decline (`4000 0000 0000 0002`) | Razorpay shows decline; our UI shows: "Payment declined..." | |
| 2.5 | Retry with valid card | Full success flow completes | |
| 2.6 | `[BE]` Network down during verification call | Frontend shows: "Connection lost during verification. Your account was not charged" | |

---

## TC-03 — Payment Webhook Handling

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 3.1 | Complete a Razorpay test payment | Backend receives `POST /api/v1/payments/webhook` | |
| 3.2 | `[BE]` Check backend log | `payment.captured` processed; HMAC-SHA256 signature verified | |
| 3.3 | `[BE]` Send webhook with invalid signature | Returns `400`; error logged as `webhook.rejected` | |
| 3.4 | `[BE]` Send duplicate webhook (same payment ID) | Returns `200` (idempotent); no duplicate processing | |

---

## TC-04 — Profile Save Flow

**Preconditions:** Payment completed (state in localStorage or fresh payment)

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 4.1 | Navigate to `/details` | Form renders with all required fields | |
| 4.2 | Submit with all fields filled | `POST /api/v1/candidates/profile` succeeds; navigates to `/diagnostic` | |
| 4.3 | `[FE]` Form shows loading state during save | Submit button disabled, spinner visible | |
| 4.4 | `[BE]` Check DB | `candidate_profiles` row exists with `candidate_code` in `CND-XXXXXX` format | |
| 4.5 | Submit with malformed LinkedIn URL (e.g. `notaurl`) | Validation error shown inline; form not submitted | |
| 4.6 | Submit with missing required field (e.g. no email) | Field-level error shown; form not submitted | |
| 4.7 | Submit with invalid phone number (< 10 digits) | Validation error shown | |
| 4.8 | Refresh `/details` page mid-fill | Form state retained from localStorage (answers not lost) | |

**Analytics events expected:** `profile_form_completed`

---

## TC-05 — Diagnostic Question Submission Flow

**Preconditions:** Profile saved, `candidateCode` in state

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 5.1 | Navigate to `/diagnostic` | `GET /api/v1/diagnostic/questions` called; 15 questions loaded | |
| 5.2 | Answer all 15 questions | Progress bar advances; each answer stored in FlowContext | |
| 5.3 | Click Submit | `POST /api/v1/diagnostic/submit` called with all 15 answers | |
| 5.4 | Submit succeeds | Navigates to `/analysis` | |
| 5.5 | `[BE]` Check DB | `diagnostic_question_responses` rows created for all 15 questions | |
| 5.6 | Submit with 14 of 15 answered | Submit disabled or shows validation; all questions must be answered | |
| 5.7 | Refresh mid-diagnostic | Previously selected answers restored from localStorage | |
| 5.8 | `[BE]` Submit same `candidateCode` twice | Second submission rejected or idempotent; no duplicate session created | |

**Analytics events expected:** `diagnostic_started`, `diagnostic_completed`

---

## TC-06 — Analysis Success Flow

**Preconditions:** Diagnostic submitted

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 6.1 | Arrive at `/analysis` | `POST /api/v1/analysis/trigger` fires; stage 1 starts | |
| 6.2 | Polling begins | `GET /api/v1/analysis/status/{candidateCode}` called every 3s | |
| 6.3 | Status progresses: `INITIATED` → `SCORING` → `LINKEDIN_ANALYSIS` → `REPORT_GENERATION` → `COMPLETED` | Stage indicators advance with each status change | |
| 6.4 | Analysis completes | Progress bar → 100%; fade-out; auto-navigate to `/report` | |
| 6.5 | `[BE]` Check DB | `diagnostic_scores` and `diagnostic_reports` rows created | |
| 6.6 | `[FE]` Refresh `/analysis` during polling | Analysis resumes; does not re-trigger (idempotent) | |

**Analytics events expected:** `analysis_started`, `report_generated`

---

## TC-07 — Analysis Failure / Fallback Flow

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 7.1 | `[BE]` OpenAI key is invalid or quota exceeded | Backend falls back to rule-based report; `reportStatus=RULE_BASED` in DB | |
| 7.2 | `[FE]` Backend returns `FAILED` status on polling | Error screen shown with "Try Again" button | |
| 7.3 | `[FE]` Analysis polling exceeds 120s timeout | Timeout error message; retry button shown | |
| 7.4 | `[FE]` Click "Try Again" after failure | `runAnalysis()` re-triggered; polling restarts | |
| 7.5 | `[BE]` Proxycurl key missing | LinkedIn score computed as 0 (rule-based); analysis still completes | |
| 7.6 | `[BE]` OpenAI returns malformed JSON | `ReportOutputValidator` catches; fallback report generated | |
| 7.7 | `[BE]` Backend timeout on analysis trigger | Frontend shows: "The analysis request timed out. Please check your connection and try again." | |
| 7.8 | `[FE]` Refresh `/analysis` after `FAILED` status | Error screen shown; retry button visible | |

---

## TC-08 — Report Fetch Flow

**Preconditions:** Analysis completed, `candidateCode` in state

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 8.1 | Arrive at `/report` | `GET /api/v1/reports/{candidateCode}` called | |
| 8.2 | Report loads | Score gauge, dimension table, gap cards, CTA all render | |
| 8.3 | `[FE]` Score matches backend value | `overallScore` in UI = value in DB `diagnostic_scores.final_employability_score` | |
| 8.4 | Refresh `/report` | Report re-fetched from backend; renders correctly | |
| 8.5 | `[BE]` Report not yet ready (analysis still running) | `reportStatus=PENDING`; frontend shows loading or redirects to `/analysis` | |
| 8.6 | `[FE]` Open report from another device/browser (same URL with `candidateCode` param if applicable) | Report renders correctly (stateless fetch) | |

**Analytics events expected:** `report_viewed`

---

## TC-09 — Consultation Booking Flow

**Preconditions:** Report loaded, user on `/report`

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 9.1 | Click consultation CTA on report page | Navigates to `/booking` | |
| 9.2 | Select date and time slot | Form fields update | |
| 9.3 | Submit booking | `POST /api/v1/consultations/book` called | |
| 9.4 | Booking confirmed | Booking reference shown (format `BK-XXXXXX`); success state rendered | |
| 9.5 | `[BE]` Check DB | `consultation_bookings` row created with `status=PENDING` | |
| 9.6 | Submit with no date/time selected | Validation error; form not submitted | |
| 9.7 | Refresh `/booking` after confirmed booking | Booking state hydrated; confirmation still shown | |

**Analytics events expected:** `consultation_cta_clicked`, `consultation_booked`

---

## TC-10 — WhatsApp Delivery Flow

**Preconditions:** `WHATSAPP_PROVIDER=meta`, valid credentials set

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 10.1 | Complete analysis successfully | WhatsApp message dispatched to candidate's phone number | |
| 10.2 | `[BE]` Check `communication_events` table | Row with `channel=WHATSAPP`, `status=SENT` and `wamid` populated | |
| 10.3 | `[BE]` Meta webhook fires delivery update | `communication_events.delivery_status` updated to `DELIVERED` | |
| 10.4 | `[BE]` Invalid phone number | `communication_events.status=FAILED`; error message stored | |
| 10.5 | `[BE]` WhatsApp credentials invalid/expired | `status=FAILED`; error logged; no exception propagated to main flow | |
| 10.6 | `[DEV]` `WHATSAPP_PROVIDER=stub` | DevEventLog shows WA event logged; no real message sent | |

---

## TC-11 — Email Delivery Flow

**Preconditions:** `EMAIL_PROVIDER=resend`, valid API key and verified domain

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 11.1 | Complete analysis successfully | Email sent to candidate's email address | |
| 11.2 | `[BE]` Check `communication_events` table | Row with `channel=EMAIL`, `status=SENT` | |
| 11.3 | `[BE]` Resend API key invalid | `status=FAILED`; error logged; flow continues unblocked | |
| 11.4 | `[BE]` Duplicate email trigger (same idempotency key) | Second send skipped; existing `SENT` row not overwritten | |
| 11.5 | `[DEV]` `EMAIL_PROVIDER=stub` | DevEventLog shows email event logged; no real email sent | |

---

## TC-12 — CRM Push Flow

**Preconditions:** `CRM_PROVIDER=webhook`, `CRM_WEBHOOK_URL` set

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 12.1 | Complete analysis successfully | `POST` to `CRM_WEBHOOK_URL` with enriched lead payload | |
| 12.2 | `[BE]` Check `communication_events` table | Row with `channel=CRM`, `status=SENT` | |
| 12.3 | Inspect webhook payload | Contains: `candidate_reference`, `email`, `employability_score`, `score_band`, `tags`, `trigger_event` | |
| 12.4 | `[BE]` Webhook URL returns `500` | `status=FAILED`; retried up to `CRM_MAX_RETRIES` times; then gives up | |
| 12.5 | `[BE]` `CRM_ENABLED=false` | No CRM push attempted; stub used | |
| 12.6 | Complete consultation booking | Second CRM push fires with `trigger_event=CONSULTATION_BOOKED` | |

---

## TC-13 — Admin Login and Dashboard Flow

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 13.1 | Navigate to `/admin/login` | Login form renders | |
| 13.2 | Enter correct credentials | JWT issued; redirect to `/admin` | |
| 13.3 | Enter wrong password | `401` returned; error message shown | |
| 13.4 | Navigate to `/admin` without token | Redirect to `/admin/login` | |
| 13.5 | `[BE]` Call `GET /api/v1/admin/leads` without Bearer token | Returns `401` | |
| 13.6 | Admin dashboard loads | Lead table shows all candidates ordered by `created_at` desc | |
| 13.7 | Filter by score band | Table filters correctly | |
| 13.8 | Click a lead row | Lead detail drawer opens with all fields | |
| 13.9 | Open Funnel Analytics page | Key funnel metrics render (if analytics events exist) | |
| 13.10 | `[BE]` Admin JWT expires | Next API call returns `401`; frontend redirects to login | |

---

## TC-14 — Interrupted Journey with Refresh

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 14.1 | Complete payment, then hard refresh on `/details` | Still on `/details`; `paymentCompleted=true` in state | |
| 14.2 | Fill details form partially, refresh | Field values are lost (not yet submitted) but user remains on `/details` | |
| 14.3 | Complete profile, answer 8/15 questions, refresh | Back to `/diagnostic`; no answers pre-filled (answers live in local state, not localStorage during fill) | |
| 14.4 | Submit diagnostic, navigate to `/analysis`, refresh mid-analysis | Analysis re-triggered (idempotent); completes normally | |
| 14.5 | Complete analysis, view report, close browser, reopen | Report page loads; report re-fetched from backend | |
| 14.6 | Complete full flow, click browser back | Guard prevents backward navigation into earlier steps | |

---

## TC-15 — Duplicate Payment Verification Attempt

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 15.1 | Complete payment; send same `gatewayPaymentId` to `/api/v1/payments/verify` twice | Second call returns `409 CONFLICT` or idempotent `200` with same result | |
| 15.2 | `[BE]` Check DB | Only one `payment_transactions` row for the payment ID | |
| 15.3 | `[FE]` Double-click the "Pay" button | `submittingRef` prevents second initiation; only one order created | |

---

## TC-16 — Incomplete / Malformed Input

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 16.1 | Submit profile with no LinkedIn URL | Field-level validation error; not submitted | |
| 16.2 | Submit profile with LinkedIn URL that is not a linkedin.com URL | Backend validation error (`VALIDATION_ERROR`); frontend shows message | |
| 16.3 | Submit diagnostic with empty `answers` array | Backend returns `400`; frontend shows error | |
| 16.4 | Submit diagnostic with `questionCode` that does not exist in catalog | Backend returns `400 VALIDATION_ERROR` | |
| 16.5 | Submit profile form with SQL injection attempt in name field | Backend parameterizes all queries; insert sanitized; no error thrown | |
| 16.6 | Submit very long string in `jobRole` (> 500 chars) | Backend validation rejects with `400`; friendly error shown | |

---

## TC-17 — OpenAI Malformed Response / Fallback

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 17.1 | `[BE]` Set `OPENAI_ENABLED=true` with valid key | AI report generated; `reportType=AI_GENERATED` in DB | |
| 17.2 | `[BE]` OpenAI returns response with missing required fields | `ReportOutputValidator` rejects; fallback report generated | |
| 17.3 | `[BE]` OpenAI returns non-JSON response | `AiJsonParser` handles gracefully; fallback used; error logged | |
| 17.4 | `[BE]` OpenAI timeout (> `OPENAI_TIMEOUT_SECONDS`) | Fallback report generated; `reportType=RULE_BASED`; no exception propagated | |
| 17.5 | `[FE]` Report page with rule-based report | Report renders identically; no UI difference exposed to user | |
| 17.6 | `[OP]` Set `VITE_OP_FALLBACK_REPORT_ONLY=true` | Frontend sends flag; backend forced to use rule-based | |

---

## TC-18 — Communication Provider Failure

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 18.1 | `[BE]` Resend API key revoked mid-flow | Email `status=FAILED`; error logged; user flow unaffected | |
| 18.2 | `[BE]` WhatsApp access token expired | WA send `status=FAILED`; error logged; user flow unaffected | |
| 18.3 | `[BE]` Both email and WA fail | User still receives report normally; only comms are lost | |
| 18.4 | `[OP]` `VITE_OP_DISABLE_MESSAGING=true` | All messaging suppressed; DevEventLog shows events not dispatched | |
| 18.5 | `[BE]` Check Slack alert | Slack ops channel receives failure notification if `SLACK_WEBHOOK_URL` is set | |

---

## TC-19 — CRM Failure

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 19.1 | `[BE]` CRM webhook URL down (returns 503) | Retry up to `CRM_MAX_RETRIES`; then `status=FAILED`; flow unaffected | |
| 19.2 | `[BE]` CRM auth header rejected (401) | No retry (4xx); `status=FAILED`; error message stored | |
| 19.3 | `[OP]` `VITE_OP_DISABLE_CRM=true` | CRM push suppressed; stub used | |
| 19.4 | `[BE]` CRM failure for one lead | Other leads unaffected; failure isolated to that event row | |

---

## TC-20 — Backend Timeout / Network Error

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 20.1 | Backend unreachable on payment initiate | Error: "Unable to reach payment gateway. Please check your connection." | |
| 20.2 | Backend returns 504 (gateway timeout) on analysis trigger | Error: "The analysis request timed out. Please check your connection and try again." | |
| 20.3 | Backend returns 500 on diagnostic submit | Error message shown; user can retry | |
| 20.4 | Backend returns 429 (rate limited) | Error: "Too many requests" shown; user can retry after a moment | |
| 20.5 | `httpClient` timeout (> 30s) | `TIMEOUT` error code; friendly message shown | |
| 20.6 | `X-Request-Id` header present in error | Error includes requestId for correlation with backend logs | |

---

## TC-21 — Admin Unauthorized Access

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 21.1 | Access `/admin` without being logged in | Redirect to `/admin/login` | |
| 21.2 | `[BE]` Call `GET /api/v1/admin/leads` without token | `401 UNAUTHORIZED` | |
| 21.3 | `[BE]` Call with expired JWT | `401 UNAUTHORIZED` | |
| 21.4 | `[BE]` Call with a JWT signed by a different secret | `401 UNAUTHORIZED` | |
| 21.5 | `[BE]` Brute-force admin login (> rate limit) | `429 TOO_MANY_REQUESTS` (when `RATE_LIMIT_ENABLED=true`) | |
| 21.6 | Admin JWT token from one environment used in another | `401` (different JWT secrets per env) | |

---

## Test Execution Log

| Date | Tester | Environment | Pass | Fail | Notes |
|------|--------|-------------|------|------|-------|
| | | | | | |
| | | | | | |
