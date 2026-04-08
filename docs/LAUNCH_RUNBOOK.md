# QualScore — Launch Runbook

Operational guide for the first live deployment. Written for the person at the keyboard on launch day.

For the full pre-launch checklist see `backend/LAUNCH_CHECKLIST.md`.
For QA test cases see `docs/QA_TEST_CASES.md`.
For deployment config see `DEPLOYMENT.md`.

---

## Go / No-Go Decision

All items in each section must be GREEN before flipping traffic.

---

## 1. Pre-Launch Verification (T-2 hours)

### 1.1 Backend health

```bash
# Replace with your actual API domain
export API=https://api.qualscore.in

curl -sf $API/actuator/health | jq .
# Expected: {"status":"UP","components":{"db":{"status":"UP"},...}}

curl -sf $API/actuator/health/liveness | jq .status
# Expected: "UP"

curl -sf $API/actuator/health/readiness | jq .status
# Expected: "UP"

curl -sf $API/api/system/version | jq .
# Expected: version field present
```

### 1.2 Database connectivity

```bash
# Flyway migrations applied
curl -sf $API/actuator/health | jq '.components.db'
# Expected: {"status":"UP","details":{"database":"PostgreSQL",...}}

# Verify migration history directly (via Supabase SQL editor or psql)
SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
# All rows should have success = true
```

### 1.3 Critical env vars confirmed on backend

```bash
# Payment provider must NOT be mock in production
curl -sf $API/api/system/version | jq .  # check app is running

# Verify via backend logs or health endpoint properties
# Look for: integrations.payment.provider = razorpay (not mock)
```

### 1.4 Admin access

```bash
# Login
TOKEN=$(curl -sf -X POST $API/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@qualscore.in","password":"YOUR_PROD_ADMIN_PASSWORD"}' \
  | jq -r '.data.token')

echo "Token received: ${TOKEN:0:20}..."

# Access protected endpoint
curl -sf $API/api/v1/admin/leads \
  -H "Authorization: Bearer $TOKEN" | jq .data.total
# Expected: a number (0 if no leads yet)
```

### 1.5 Frontend loads

- Open `https://qualscore.in` in an incognito window
- Landing page renders without console errors
- Network tab: no requests to `localhost`
- `VITE_API_BASE_URL` value in bundle points to production API

### 1.6 Razorpay webhook registered

Go to: Razorpay Dashboard → Webhooks → Confirm:
- URL: `https://api.qualscore.in/api/v1/payments/webhook`
- Event: `payment.captured` is checked
- Status: Active

### 1.7 CORS confirmed

```bash
# From browser DevTools console on https://qualscore.in:
fetch('https://api.qualscore.in/actuator/health')
  .then(r => r.json()).then(console.log)
# Must not show CORS error
```

---

## 2. Operational Mode Flags at Launch

Set these in your backend deployment platform for launch day:

| Variable | Launch Day Value | Notes |
|----------|-----------------|-------|
| `INTEGRATIONS_PAYMENT_PROVIDER` | `razorpay` | Switch from `mock` |
| `OPENAI_ENABLED` | `false` → `true` after first 5 leads verify | Enable AI reports once confirmed working |
| `EMAIL_PROVIDER` | `resend` | Enable once Resend domain verified |
| `WHATSAPP_PROVIDER` | `stub` → `meta` when ready | Enable after WhatsApp template approval |
| `CRM_PROVIDER` | `stub` → `webhook` when ready | Enable after CRM webhook tested |
| `RATE_LIMIT_ENABLED` | `true` | Always on in production |
| `ADMIN_SEED_ENABLED` | `false` | Disable after first deploy confirms admin exists |

Frontend feature flags (set in deployment platform for build):

| Variable | Launch Day Value | Notes |
|----------|-----------------|-------|
| `VITE_FF_LINKEDIN_ANALYSIS` | `false` | Keep off until Proxycurl confirmed |
| `VITE_FF_LLM_REPORT` | `false` | Keep off; backend handles OpenAI internally |
| `VITE_FF_CRM_SYNC` | `false` | Backend handles CRM; frontend flag unused |
| `VITE_FF_NOTIFICATIONS` | `false` | Backend handles comms; frontend flag unused |

---

## 3. First Payment End-to-End Test (T-1 hour)

Run this with a real card on the live production environment before opening traffic.

```
1. Open https://qualscore.in in an incognito window
2. Click "Get your report"
3. Pay ₹199 with your real card (you will be charged)
4. Verify redirect to /details
5. Fill all profile fields
6. Complete all 15 diagnostic questions
7. Watch analysis progress to completion
8. Confirm report loads with a score
9. Check your email — report notification should arrive (if Resend enabled)
10. Check your phone — WhatsApp message should arrive (if WhatsApp enabled)
11. Book a consultation
12. Check admin dashboard — lead should appear
```

Verify in DB after this test:
- `candidate_profiles`: 1 row with your email
- `payment_transactions`: 1 row with `status=COMPLETED`
- `diagnostic_question_responses`: 15 rows
- `diagnostic_scores`: 1 row with non-zero score
- `diagnostic_reports`: 1 row with `report_status=GENERATED` (or `RULE_BASED`)
- `communication_events`: WA and email rows with `status=SENT` (if enabled)
- `consultation_bookings`: 1 row with your booking reference

---

## 4. Monitoring Setup (Before Traffic Opens)

### 4.1 Key metrics to watch in the first hour

| Metric | Alert threshold | How to check |
|--------|----------------|--------------|
| `qualcore.payment.failed` | Any | Prometheus / Grafana |
| `qualcore.webhook.rejected` | Any | Prometheus / Grafana |
| `qualcore.ai.failure` | > 3 per hour | Prometheus / Grafana |
| HTTP 5xx rate | > 1% | Prometheus / Grafana |
| Analysis completion rate | < 80% | Check `diagnostic_reports` vs `candidate_profiles` |
| DB connection pool | > 80% in use | Prometheus / Grafana |

### 4.2 Live log monitoring

Watch backend logs for these patterns:

```bash
# Successful payment
grep "payment.captured" application.log

# AI report generation
grep "REPORT_GENERATION" application.log

# WhatsApp dispatch
grep "\[WhatsApp\]" application.log

# CRM push
grep "\[CRM\]" application.log

# Any ERROR level entries
grep "ERROR" application.log
```

### 4.3 Supabase dashboard

Keep the Supabase SQL editor open with this query running:

```sql
SELECT
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') AS leads_last_hour,
  COUNT(*) FILTER (WHERE payment_status = 'COMPLETED' AND created_at > now() - interval '1 hour') AS paid_last_hour,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour' AND final_employability_score IS NOT NULL) AS reports_generated
FROM candidate_profiles;
```

---

## 5. First 50 Leads — Manual Review Checklist

For each of the first 50 leads, manually verify:

- [ ] `candidate_profiles` row created with correct email
- [ ] `payment_transactions` row with `status=COMPLETED` and non-zero amount
- [ ] `diagnostic_question_responses` rows — count = 15
- [ ] `diagnostic_scores` row with `final_employability_score` > 0
- [ ] `diagnostic_reports` row with `report_status` = `GENERATED` or `RULE_BASED`
- [ ] `communication_events` rows — at minimum a WA or email row (if enabled)
- [ ] Admin dashboard shows lead with correct score and tags

```sql
-- Spot-check query
SELECT
  cp.candidate_code,
  cp.email,
  pt.status AS payment_status,
  COUNT(dqr.id) AS answer_count,
  ds.final_employability_score,
  dr.report_status,
  COUNT(ce.id) AS comm_events
FROM candidate_profiles cp
LEFT JOIN payment_transactions pt ON pt.candidate_profile_id = cp.id
LEFT JOIN diagnostic_question_responses dqr ON dqr.candidate_profile_id = cp.id
LEFT JOIN diagnostic_scores ds ON ds.candidate_profile_id = cp.id
LEFT JOIN diagnostic_reports dr ON dr.candidate_profile_id = cp.id
LEFT JOIN communication_events ce ON ce.candidate_profile_id = cp.id
WHERE cp.created_at > now() - interval '24 hours'
GROUP BY cp.candidate_code, cp.email, pt.status, ds.final_employability_score, dr.report_status
ORDER BY cp.created_at DESC;
```

---

## 6. Incident Response — Common Issues

### Analysis stuck at INITIATED

**Symptom:** `/analysis` page polls forever; status never advances past `INITIATED`

**Diagnosis:**
```bash
GET /api/v1/analysis/status/{candidateCode}
# If always returns INITIATED:
grep "candidateCode" application.log | grep "SCORING\|LINKEDIN"
# If no SCORING entries: OpenAI or scoring service is blocked
```

**Resolution:**
1. Check `OPENAI_API_KEY` is valid and has quota
2. Check backend logs for exceptions in `DiagnosticScoringService`
3. If AI blocked: set `OPENAI_ENABLED=false` — rule-based fallback activates

### Payment verified but user stuck at checkout

**Symptom:** User paid, Razorpay shows success, but frontend stuck at "verifying"

**Diagnosis:**
```bash
curl $API/actuator/health | jq .  # is backend up?
grep "verify" application.log | tail -20  # any errors?
```

**Resolution:**
1. Check backend logs for `PaymentVerificationException`
2. If `RAZORPAY_KEY_SECRET` is wrong: fix and restart
3. If backend is down: bring it back up — the user can click "Try again" to re-verify

### Report not loading after analysis

**Symptom:** Analysis shows `COMPLETED` but `/report` shows error or empty state

**Diagnosis:**
```bash
GET /api/v1/reports/{candidateCode}
# Check response — is reportStatus GENERATED or RULE_BASED?
```

```sql
SELECT report_status, report_data IS NOT NULL AS has_data
FROM diagnostic_reports
WHERE candidate_code = 'CND-XXXXXX';
```

**Resolution:**
1. If `report_data` is NULL: report generation failed silently — check logs for `ReportGenerationService`
2. If no row: trigger re-analysis via admin panel or direct API call

### Admin login failing

**Symptom:** Admin login returns 401 with correct credentials

**Diagnosis:**
```bash
grep "AdminAuthService" application.log | tail -20
```

**Resolution:**
1. Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars match what you're logging in with
2. Check `admin_users` table has a row with `email = ADMIN_EMAIL`:
   ```sql
   SELECT id, email, is_active FROM admin_users;
   ```
3. If no row: set `ADMIN_SEED_ENABLED=true`, restart, log in, set back to `false`
4. If row exists but login fails: password hash may be stale — update via:
   ```sql
   -- Generate new hash from Java: new BCryptPasswordEncoder(12).encode("NewPassword!")
   UPDATE admin_users SET password_hash = '$2a$12$...' WHERE email = 'admin@qualscore.in';
   ```

### WhatsApp messages not sending

**Symptom:** `communication_events` row has `status=FAILED`

**Diagnosis:**
```sql
SELECT error_message, delivery_status FROM communication_events
WHERE channel = 'WHATSAPP'
ORDER BY created_at DESC LIMIT 10;
```

**Resolution:**
- `Access token expired`: regenerate system-user token in Meta Business Manager
- `Template not approved`: message template needs approval in Meta → Message Templates
- `Invalid phone number`: check candidate phone number format (must be E.164 without `+`)

---

## 7. Rollback Procedure

### Frontend rollback (< 30 seconds)

Netlify: Site overview → Deploys → Click previous deploy → "Publish deploy"
Vercel: Project → Deployments → Previous → "Promote to production"

### Backend rollback

```bash
# Render: re-deploy a previous image via dashboard

# Self-hosted:
docker pull registry.yourdomain.com/qualcore-app:v0.9.0
docker compose -f docker-compose.yml up -d app
```

### Database rollback

Flyway migrations are additive (no DROP statements in V1–V12). Rolling back the application binary is safe — the schema is compatible with the previous version.

If a migration must be reversed, do it manually:
1. Write a compensating migration (add a new Vxx file, never edit existing)
2. Apply via Flyway
3. Deploy the previous application binary

---

## 8. Post-Launch Sign-Off

Complete after the first 24 hours of live traffic:

- [ ] At least 10 successful end-to-end journeys (payment → report)
- [ ] Zero HTTP 5xx errors in backend logs from user-facing endpoints
- [ ] Payment webhook processing confirmed (no `webhook.rejected` events)
- [ ] Admin dashboard reflects all leads with correct scores
- [ ] At least one AI-generated report confirmed (if OpenAI enabled)
- [ ] WhatsApp delivery confirmed for at least 3 candidates (if enabled)
- [ ] Email delivery confirmed for at least 3 candidates (if enabled)
- [ ] No data loss — every paid candidate has a report
- [ ] `ADMIN_SEED_ENABLED=false` confirmed in production

**Sign-off:**

Launch confirmed by: _____________________ Date: _______________
