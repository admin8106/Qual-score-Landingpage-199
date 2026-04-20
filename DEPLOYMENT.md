# QualScore — Deployment Guide

Cross-system reference for deploying the full QualScore stack:
**React frontend** + **Spring Boot backend** + **Supabase** + all third-party integrations.

For backend-specific pre-launch items see `backend/LAUNCH_CHECKLIST.md`.
For backend developer setup see `backend/DEVELOPER_NOTES.md`.

---

## Architecture Overview

```
Browser
  └─► Frontend (React/Vite)          — Netlify / Vercel / static host
        │
        ├─► Backend API (Spring Boot) — Render / Railway / AWS ECS / VPS
        │     └─► PostgreSQL          — Supabase (shared DB)
        │
        └─► Supabase (direct)        — analytics_events RLS reads
```

**Domain map (production)**

| Service          | Domain                          |
|------------------|---------------------------------|
| Frontend         | `https://qualscore.in`          |
| Backend API      | `https://api.qualscore.in`      |
| Supabase project | `https://xxx.supabase.co`       |

**Domain map (staging)**

| Service          | Domain                               |
|------------------|--------------------------------------|
| Frontend         | `https://staging.qualscore.in`       |
| Backend API      | `https://api-staging.qualscore.in`   |

---

## 1. Domains and HTTPS

- All services must run on HTTPS. No plain HTTP in staging or production.
- Configure your DNS to point the frontend domain to the static hosting CDN.
- Configure your DNS to point the API domain to the backend server/load balancer.
- Use Cloudflare or your hosting provider's TLS termination — no self-signed certs.

CORS on the backend must list the exact frontend origin (no wildcards in production):

```yaml
# backend/src/main/resources/application-prod.yml via env var
CORS_ALLOWED_ORIGINS=https://qualscore.in
```

For staging:
```
CORS_ALLOWED_ORIGINS=https://staging.qualscore.in
```

---

## 2. Backend Deployment

### Recommended platforms

| Platform | Notes |
|----------|-------|
| **Render** | Simple Docker deploy, free tier available, auto-TLS, env var management |
| **Railway** | Docker-native, fast deploys, built-in Postgres available |
| **AWS ECS / Fargate** | Production-grade, requires more setup, integrates with ALB |
| **VPS (DigitalOcean / Hetzner)** | Full control, use nginx as reverse proxy, certbot for TLS |

### Docker-based deploy

```bash
# Build image
docker build -t qualcore-app:latest ./backend

# Tag for registry
docker tag qualcore-app:latest registry.yourdomain.com/qualcore-app:v1.0.0

# Push
docker push registry.yourdomain.com/qualcore-app:v1.0.0
```

The image exposes port `8080`. Set `PORT` env var if your platform uses a different port.

### Required environment variables (backend)

All must be set in your deployment platform's secret/env management — never in committed files.

#### Core (required)

| Variable | Description | Example |
|----------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `prod` |
| `APP_ENV` | Environment name | `prod` |
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://db.xxx.supabase.co:5432/postgres` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | _(strong, 32+ chars)_ |
| `JWT_SECRET` | Admin token signing secret | _(openssl rand -base64 64)_ |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `https://qualscore.in` |

#### Payment (required for live payments)

| Variable | Description |
|----------|-------------|
| `INTEGRATIONS_PAYMENT_PROVIDER` | `razorpay` or `payu` (not `mock`) |
| `RAZORPAY_KEY_ID` | Razorpay publishable key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay dashboard → Webhooks |

#### OpenAI (required for AI reports)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_ENABLED` | `true` |
| `OPENAI_MODEL` | `gpt-4o` |

#### Email (optional — falls back to stub)

| Variable | Description |
|----------|-------------|
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Resend.com API key |
| `EMAIL_FROM_ADDRESS` | Verified sender (e.g. `reports@qualscore.in`) |
| `EMAIL_FROM_NAME` | Display name (e.g. `QualScore`) |

#### WhatsApp (optional — falls back to stub)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_PROVIDER` | `meta` |
| `WHATSAPP_ACCESS_TOKEN` | Permanent system-user access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric Phone Number ID from Meta |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta WABA ID |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Secret string matching Meta webhook config |

#### CRM (optional — falls back to stub)

| Variable | Description |
|----------|-------------|
| `CRM_PROVIDER` | `webhook` |
| `CRM_WEBHOOK_URL` | Full HTTPS endpoint (Zapier / Make / HubSpot / internal) |
| `CRM_WEBHOOK_SECRET` | Sent as `Authorization: Bearer <secret>` |

#### Admin seeding

| Variable | Description |
|----------|-------------|
| `ADMIN_SEED_ENABLED` | `true` on first deploy, then `false` |
| `ADMIN_EMAIL` | First admin user email |
| `ADMIN_PASSWORD` | First admin user password (change immediately after) |

### Database

The backend connects to the same Supabase PostgreSQL instance used by the frontend.

**Supabase connection string format:**

```
jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

Flyway runs automatically at startup and applies any pending migrations from `backend/src/main/resources/db/migration/`.

The frontend Supabase migrations in `supabase/migrations/` must be applied separately via the Supabase dashboard or CLI before the first backend deploy.

### Health and readiness endpoints

| Endpoint | Purpose | Access |
|----------|---------|--------|
| `GET /actuator/health` | Overall health (DB, app) | Load balancer health check |
| `GET /actuator/health/liveness` | JVM alive | Kubernetes/container liveness probe |
| `GET /actuator/health/readiness` | App ready for traffic | Kubernetes/container readiness probe |
| `GET /actuator/info` | App version | CI/CD version tracking |
| `GET /actuator/prometheus` | Metrics for Prometheus scraper | Internal only |

Configure your load balancer to health check `GET /actuator/health/liveness` every 30s.

**Swagger UI is disabled in production** (`application-prod.yml`). API docs are only accessible in dev/staging.

---

## 3. Frontend Deployment

### Recommended platforms

| Platform | Notes |
|----------|-------|
| **Netlify** | Zero-config, env var UI, instant rollback, PR previews |
| **Vercel** | Fastest global CDN, great DX, env var per environment |
| **Cloudflare Pages** | Best performance, generous free tier |

### Build commands

```bash
# Production build
npm run build

# Staging build
npx vite build --mode staging

# Preview build output locally
npm run preview
```

Output: `dist/` — deploy this directory.

### Required environment variables (frontend)

Set in your CI/CD platform — not in committed files.

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API origin (no trailing slash) | `https://api.qualscore.in` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) | `eyJ...` |

### Optional frontend variables

| Variable | Description |
|----------|-------------|
| `VITE_APP_URL` | Canonical frontend URL for share links |
| `VITE_RAZORPAY_KEY_ID` | Razorpay publishable key (live: `rzp_live_...`) |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics 4 |
| `VITE_META_PIXEL_ID` | Meta/Facebook Pixel |
| `VITE_SENTRY_DSN` | Sentry error tracking |

### Feature flags

All default to `false`. Set to `"true"` only after backend integration is live and tested.

| Variable | Enables |
|----------|---------|
| `VITE_FF_LINKEDIN_ANALYSIS` | Proxycurl LinkedIn enrichment |
| `VITE_FF_LLM_REPORT` | GPT-4o AI report narrative |
| `VITE_FF_CRM_SYNC` | CRM webhook push |
| `VITE_FF_NOTIFICATIONS` | WhatsApp + email on report ready |

### Netlify setup

1. Connect the GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set env vars in: Site settings → Environment variables
5. Add a `_redirects` file or `netlify.toml` for SPA routing:

```
# dist/_redirects  (or create public/_redirects before build)
/*    /index.html   200
```

Or in `netlify.toml` at the project root:

```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

### Vercel setup

1. Import project
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set env vars in: Settings → Environment Variables (per environment)

Vercel handles SPA routing automatically.

---

## 4. Webhook Endpoints

Third-party services POST callbacks to the backend. Register these URLs in each provider's dashboard.

### Razorpay payment webhook

```
POST https://api.qualscore.in/api/v1/payments/webhook
```

- Register at: Razorpay Dashboard → Webhooks → Add New Webhook
- Event to subscribe: `payment.captured`
- Copy the auto-generated webhook secret to `RAZORPAY_WEBHOOK_SECRET`
- The endpoint verifies the `X-Razorpay-Signature` header using HMAC-SHA256

### Meta WhatsApp delivery webhook

```
GET  https://api.qualscore.in/api/webhooks/whatsapp   (verification challenge)
POST https://api.qualscore.in/api/webhooks/whatsapp   (delivery status updates)
```

- Register at: Meta Business Manager → WhatsApp → Configuration → Webhooks
- Callback URL: as above
- Verify Token: set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` to a secret string and enter the same value in Meta
- Subscribe to: `messages` (covers sent, delivered, read, failed status)

Both webhook endpoints are excluded from rate limiting and do not require a JWT.

---

## 5. Payment Provider Configuration

### Razorpay (recommended for India)

1. Create account at razorpay.com
2. **Test mode**: use test key pair during staging
3. **Live mode**: activate live key pair only for production
4. Frontend key (`VITE_RAZORPAY_KEY_ID`): starts with `rzp_test_` (staging) or `rzp_live_` (prod)
5. Backend secret (`RAZORPAY_KEY_SECRET`): never in frontend
6. Set `INTEGRATIONS_PAYMENT_PROVIDER=razorpay` on the backend

**Callback URLs** (set in Razorpay dashboard if required):
- Success redirect: handled client-side — no server redirect needed
- Webhook: `https://api.qualscore.in/api/v1/payments/webhook`

### PayU (alternative)

1. Set `INTEGRATIONS_PAYMENT_PROVIDER=payu`
2. Staging: `PAYU_BASE_URL=https://test.payu.in`
3. Production: `PAYU_BASE_URL=https://secure.payu.in`
4. Set `PAYU_MERCHANT_KEY` and `PAYU_MERCHANT_SALT`

---

## 6. Supabase Setup

The frontend reads analytics events directly from Supabase. The backend writes to the same Supabase PostgreSQL database.

### Apply migrations

Frontend Supabase migrations (in `supabase/migrations/`) must be applied before the first deploy:

```bash
# Using Supabase CLI
supabase db push

# Or apply each migration manually via Supabase Dashboard → SQL Editor
```

Backend Flyway migrations (in `backend/src/main/resources/db/migration/`) run automatically on backend startup.

### Supabase connection

The backend connects via a direct JDBC connection (not the Supabase REST API). Use the **direct connection** string from Supabase Dashboard → Settings → Database → Connection string (URI format), not the pooler.

```
DB_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

### Row-level security

All tables created by frontend migrations have RLS enabled. The backend uses a direct database connection (not the anon key), so it bypasses RLS — this is expected. The frontend's Supabase client uses the anon key and is subject to all RLS policies.

---

## 7. Environment File Summary

| File | Committed | Purpose |
|------|-----------|---------|
| `.env` | Yes | Frontend local dev defaults (no secrets) |
| `.env.staging` | Yes | Frontend staging non-secret config |
| `.env.production` | Yes | Frontend production non-secret config |
| `.env.local` | No | Personal overrides, never committed |
| `backend/.env.example` | Yes | Backend variable reference template |
| `backend/.env` | No | Backend local dev secrets, never committed |

---

## 8. Post-Deploy Smoke Tests

Run these against the deployed environment before opening traffic.

### Backend

```bash
export API=https://api.qualscore.in

# Health
curl -sf $API/actuator/health | jq .status

# Version
curl -sf $API/api/system/version | jq .

# Diagnostic questions (no auth)
curl -sf $API/api/v1/diagnostic/questions | jq '.data | length'
# Expected: 15

# Admin login
curl -sf -X POST $API/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@qualscore.in","password":"YOUR_ADMIN_PASSWORD"}' | jq .

# Admin leads (no token — expect 401)
curl -o /dev/null -w "%{http_code}" $API/api/v1/admin/leads
# Expected: 401

# Admin leads (with token)
TOKEN=$(curl -sf -X POST $API/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@qualscore.in","password":"YOUR_ADMIN_PASSWORD"}' | jq -r .data.token)
curl -sf $API/api/v1/admin/leads -H "Authorization: Bearer $TOKEN" | jq .data.total
```

### Frontend

- Open `https://qualscore.in` — landing page loads without console errors
- Network tab: no requests to `localhost` (confirm `VITE_API_BASE_URL` is set)
- Click through to the diagnostic — questions load from the backend
- Admin login at `/admin/login` — signs in and renders the lead table

---

## 9. Staging vs Production Config Differences

| Setting | Staging | Production |
|---------|---------|------------|
| `SPRING_PROFILES_ACTIVE` | `staging` | `prod` |
| Swagger UI | Enabled | **Disabled** |
| Admin seeder | Enabled | Disabled after first deploy |
| Rate limiting | Enabled (higher limits) | Enabled (standard limits) |
| Payment provider | `mock` or `razorpay` test keys | `razorpay` / `payu` live keys |
| OpenAI | Disabled (rule-based reports) | Enabled |
| Source maps | Enabled | Disabled |
| Log level | `DEBUG` | `INFO` |
| CORS origins | `https://staging.qualscore.in` | `https://qualscore.in` |
| Razorpay key prefix | `rzp_test_` | `rzp_live_` |

---

## 10. Rollback Procedure

### Frontend

Static hosts (Netlify/Vercel) keep all previous deploys. Rollback via the platform dashboard in under 30 seconds.

### Backend

```bash
# Roll back to previous Docker image tag
docker pull registry.yourdomain.com/qualcore-app:v0.9.0
docker tag registry.yourdomain.com/qualcore-app:v0.9.0 qualcore-app:latest
docker compose up -d app
```

Or in Render/Railway: use the platform's deploy history to re-deploy a previous release.

**Database**: Flyway migrations are intentionally non-destructive (no `DROP` or column removals in early releases). Rolling back the application code is safe — the schema changes are additive.

---

## 11. Secrets That Must Never Be in Frontend Code or Committed Files

| Secret | Correct location |
|--------|-----------------|
| Razorpay secret key | Backend env var only |
| Supabase service role key | Backend / Supabase Edge Functions only |
| OpenAI API key | Backend env var only |
| Proxycurl API key | Backend env var only |
| WhatsApp access token | Backend env var only |
| Resend API key | Backend env var only |
| CRM API key / webhook secret | Backend env var only |
| JWT signing secret | Backend env var only |
| Admin password | Backend env var only |
| DB password | Backend env var only |

The `VITE_SUPABASE_ANON_KEY` is intentionally public — it is the low-privilege Supabase client key governed by row-level security. All other keys stay on the server.
