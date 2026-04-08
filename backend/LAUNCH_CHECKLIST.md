# QualCore — Production Launch Checklist

This checklist must be completed before any production deployment.
Check each item, verify the outcome, and sign off before go-live.

---

## 1. Database

- [ ] **DB_URL** points to the production PostgreSQL instance (not localhost, not dev)
- [ ] **DB_USERNAME / DB_PASSWORD** are production credentials (min 32-char password)
- [ ] Flyway migrations applied: run `GET /actuator/health` and verify `db` component is UP
- [ ] Verify all Flyway migration scripts ran in order (check `flyway_schema_history` table)
- [ ] `spring.jpa.hibernate.ddl-auto=none` (never `update` or `create-drop` in prod)
- [ ] Connection pool size set appropriately: `DB_POOL_SIZE=20` for initial load
- [ ] DB backups are scheduled and tested (daily minimum, point-in-time recovery configured)
- [ ] DB is not directly accessible from the internet (VPC/private subnet only)

---

## 2. Core Environment Variables

- [ ] `SPRING_PROFILES_ACTIVE=prod` is set
- [ ] `APP_ENV=prod` is set
- [ ] `PORT` is set correctly (default: 8080)
- [ ] `JWT_SECRET` is a random string of at least 64 characters
  - Generate: `openssl rand -base64 64`
  - This is the only secret protecting all admin API access
- [ ] `JWT_EXPIRATION_MS` is set (default 86400000 = 24 hours; reduce for higher security)

---

## 3. Payment Gateway

- [ ] `INTEGRATIONS_PAYMENT_PROVIDER` is set to `razorpay` or `payu` (not `mock`)
- [ ] **Razorpay**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are all set
- [ ] **PayU**: `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_BASE_URL=https://secure.payu.in` are set
- [ ] Webhook endpoint is registered in the payment gateway dashboard:
  - Razorpay: Dashboard → Webhooks → add `https://api.yourdomain.com/api/v1/payments/webhook`
  - Select event: `payment.captured`
  - Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`
- [ ] Payment webhook URL is in the rate-limit **exclusion list** (already excluded in WebMvcConfig)
- [ ] Test a complete payment flow in the gateway's test/sandbox mode before switching to live keys
- [ ] Confirm the test INR amount (4990 paise = ₹49.90) processes correctly end-to-end

---

## 4. OpenAI (AI Report Generation)

- [ ] `OPENAI_API_KEY` is set and valid
- [ ] `OPENAI_ENABLED=true`
- [ ] `OPENAI_MODEL` is set to `gpt-4o` (or `gpt-4-turbo` as fallback)
- [ ] API key has sufficient credits/quota for expected daily report volume
- [ ] Verify AI is working: submit a diagnostic and confirm `reportStatus=GENERATED` (not `RULE_BASED`) in the DB
- [ ] Monitor `qualcore.ai.failure` metric in the first 24 hours after launch
- [ ] If AI key is not yet available at launch: set `OPENAI_ENABLED=false` — rule-based fallback will serve reports automatically

---

## 5. Frontend Origin (CORS)

- [ ] `CORS_ALLOWED_ORIGINS` includes only the production frontend URL
  - Example: `CORS_ALLOWED_ORIGINS=https://app.qualscore.in`
  - Do NOT include localhost in production
- [ ] Verify the frontend can make API requests without CORS errors in production browser

---

## 6. Admin Authentication

- [ ] `JWT_SECRET` is configured (also used for admin token signing)
- [ ] Admin JWT tokens are generated and securely distributed to admin users
  - Generate admin token via the internal `JwtService.generateToken(adminUserId)` utility
  - Or via a future admin login endpoint
- [ ] Admin API (`/api/v1/admin/**`) is NOT accessible without a valid Bearer token
  - Verify: `curl https://api.yourdomain.com/api/v1/admin/leads` → expect HTTP 401/403

---

## 7. Communication Providers

- [ ] **Email (Resend)**: `RESEND_API_KEY` is set and domain is verified in Resend dashboard
- [ ] `EMAIL_FROM_ADDRESS` matches a verified sending domain
- [ ] **WhatsApp**: `WHATSAPP_API_KEY`, `WHATSAPP_SENDER_ID`, `WHATSAPP_PROVIDER` are set
- [ ] **CRM**: `CRM_API_KEY`, `CRM_API_URL`, `CRM_OWNER_ID`, `CRM_PROVIDER` are set
- [ ] **Slack**: `SLACK_WEBHOOK_URL` is set for ops alerts channel
- [ ] **Calendly**: `CALENDLY_API_KEY` and `CALENDLY_EVENT_TYPE_URI` are set for booking flow
- [ ] If any provider is not yet configured, confirm the service layer gracefully skips (logs a warning, does not throw)

---

## 8. Security Configuration

- [ ] `RATE_LIMIT_ENABLED=true` in production
- [ ] `RATE_LIMIT_PUBLIC_RPM=60` (adjust based on expected load)
- [ ] `RATE_LIMIT_ADMIN_RPM=120`
- [ ] Server is behind a reverse proxy / load balancer (nginx, AWS ALB, Cloudflare)
- [ ] HTTPS is enforced — no plain HTTP access to the API in production
- [ ] `server.error.include-message=never` and `include-stacktrace=never` are active (already set in application.yml)
- [ ] Health endpoints (`/actuator/health`) are accessible from load balancer health checks but not the open internet (or use `when-authorized` and restrict IP)

---

## 9. Monitoring and Observability

- [ ] `GET /actuator/health` returns `{"status":"UP"}` with `db` component UP
- [ ] `GET /actuator/health/liveness` returns `{"status":"UP"}`
- [ ] `GET /actuator/health/readiness` returns `{"status":"UP"}`
- [ ] `GET /actuator/prometheus` returns Prometheus metrics (for scraping)
- [ ] Log aggregator (Datadog / Grafana Loki / CloudWatch) is connected to container stdout
- [ ] Prometheus/Grafana dashboard is set up with these key metrics:
  - `qualcore.ai.failure` — AI failures (alert if > 3 per hour)
  - `qualcore.payment.failed` — payment failures (alert if > 0 per day)
  - `qualcore.webhook.rejected` — rejected webhooks (alert if any)
  - `http.server.requests` — p95 latency and error rate
- [ ] Error alerting is configured (PagerDuty / Slack alert on HTTP 5xx > threshold)
- [ ] `X-Request-Id` header is present in responses (verify with `curl -i`)
- [ ] Request IDs appear in logs: `grep "requestId" application.log` returns results

---

## 10. Pre-Launch Smoke Test

Run these checks against the production environment before opening traffic:

- [ ] `POST /api/v1/payments/initiate` — returns 201 with `paymentReference`
- [ ] `POST /api/v1/payments/verify` — returns 200 with `verified: true`
- [ ] `POST /api/v1/candidates/profile` — returns 201 with `candidateCode` in `CND-XXXXXX` format
- [ ] `GET /api/v1/diagnostic/questions` — returns 15 questions
- [ ] `POST /api/v1/diagnostic/submit` — returns 200 with score result
- [ ] `POST /api/v1/diagnostic/analyze/{candidateCode}` — returns 200, triggers analysis
- [ ] `GET /api/v1/reports/{candidateCode}` — returns report (AI or rule-based)
- [ ] `POST /api/v1/consultations` — returns 201 with `bookingReference`
- [ ] `GET /api/v1/admin/leads` with valid Bearer token — returns lead list
- [ ] `GET /api/v1/admin/leads` without token — returns 401

---

## 11. Rollback Plan

- [ ] Previous Docker image is tagged and available for instant rollback
- [ ] Rollback command is documented for on-call team:
  - `docker pull qualcore/qualcore-app:prev && docker-compose up -d`
- [ ] DB migrations are backward-compatible (no column drops in first 3 releases)
- [ ] Flyway migration checksums are verified before each deployment

---

_Last reviewed: [DATE]_
_Reviewed by: [NAME]_
_Environment: [prod / staging]_
