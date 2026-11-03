# KAVACH CAMPUS — PRODUCTION DEPLOYMENT & INFRASTRUCTURE GUIDE

**Document Date:** 2026-11-03
**Hosting Target:** Vercel Production
**Production URL:** [https://kavach-campus.vercel.app](https://kavach-campus.vercel.app)
**CI/CD Pipeline:** GitHub Actions (`.github/workflows/safe-walk-scheduler.yml`)

---

## 1. Production Build & Execution

The project uses Next.js 16 with the Turbopack engine. Build scripts are defined in `package.json`:

```bash
# Clean prebuild lock check & production Turbopack compilation
npm run build
```

The output generates 69 production routes (static pages and dynamic API route handlers).

---

## 2. Required Production Environment Variables (Vercel)

| Variable | Scope | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SITE_URL` | Public / Browser | `https://kavach-campus.vercel.app` (Resolves dynamic OAuth callbacks) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Browser | Supabase project URL (`https://polbnvszmvblwenfnqll.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Public / Browser | Supabase publishable anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | Supabase administrative service role key (for user provisioning & signed URLs) |
| `GEMINI_API_KEY` | Server-Only | Google Gemini API key for incident classification |
| `CRON_SECRET` | Server-Only | Shared bearer token authenticating scheduled cron invocations |
| `ENABLE_DEMO_SMS` | Server-Only | `true` enables ₹0 simulated SMS for student verification during testing |
| `TWILIO_ACCOUNT_SID` | Server-Only | Twilio Account SID (for real SMS delivery) |
| `TWILIO_AUTH_TOKEN` | Server-Only | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Server-Only | Dedicated sender phone number |
| `SMTP_HOST` | Server-Only | SMTP server hostname (e.g. `smtp.sendgrid.net`) |
| `SMTP_PORT` | Server-Only | `587` |
| `SMTP_USER` | Server-Only | `apikey` |
| `SMTP_PASS` | Server-Only | SendGrid or provider API key |
| `SMTP_FROM` | Server-Only | Verified sender email address |

---

## 3. GitHub Actions Safe Walk Scheduler Workflow

File: `.github/workflows/safe-walk-scheduler.yml`

* **Schedule:** `*/5 * * * *` (Runs every 5 minutes)
* **Required GitHub Secrets:**
  * `CRON_SECRET`: Must match the Vercel `CRON_SECRET` variable.
  * `VERCEL_PROJECT_URL`: `https://kavach-campus.vercel.app`
* **Endpoints Triggered:**
  * `POST /api/cron/safe-walk-timeout`
  * `POST /api/cron/escalate`
* **Security Controls:**
  * Strict HTTPS origin verification via Node.js before curl invocation.
  * Masking of `CRON_SECRET` (`::add-mask::`).
  * Manual dispatch (`workflow_dispatch`) runs as a safe configuration dry-run without hitting live endpoints.
