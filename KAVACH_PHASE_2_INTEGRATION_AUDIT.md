# KAVACH CAMPUS — PHASE 2 INTEGRATION AUDIT

**Project:** Kavach Campus  
**Audit Scope:** External APIs, SDKs, Services & Environment Configurations  
**Audit Date:** 2026-11-03  

---

## 1. External Integration Classification Table

| Integration Service | Target Capability | Implementation Files | Credentials Status | Real Test Evidence | Classification |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Vercel Deployment** | Serverless Hosting & Next.js SSR | `vercel.json`, `next.config.ts` | Configured | Deployment `dpl_HMGxXjJVyTYEGJZkD1gau5A9EGsS` Ready | **VERIFIED** |
| **Supabase PostgreSQL** | Relational Database with PostGIS | `src/lib/supabase/*` | Configured | Unit tests & mocked queries pass | **CODE PRESENT** |
| **Supabase Auth** | Session management & JWTs | `src/proxy.ts`, `src/lib/supabase/*` | Configured | Sign-in, sign-out, proxy gates pass | **CODE PRESENT** |
| **Supabase Storage** | Encrypted buckets (`id-cards`, `evidence-media`) | `src/app/api/student/verify-id/route.ts` | Configured | Magic-byte checks & upload logic pass | **CODE PRESENT** |
| **Google OAuth** | Institutional Single Sign-On | `src/app/api/auth/google/route.ts` | Configured (Vercel) | Test suite passes (22/22) | **CODE PRESENT** |
| **SMTP / Email OTP** | Institutional OTP Dispatch | `src/lib/notifications/email.ts` | Configured (Vercel) | Behavioral tests verify graceful fallback | **CODE PRESENT** |
| **Gemini AI** | Incident classification & advisory | `src/app/api/incidents/[id]/notes/route.ts` | Configured (Local) | Advisory note generation logic present | **CODE PRESENT** |
| **Twilio SMS** | Real Carrier SMS Dispatch | `src/lib/sms/demo-provider.ts` | Configured (Vercel) | Simulated in tests (prevents carrier fees) | **CODE PRESENT / SIMULATED** |
| **Google FCM** | Push Notifications to devices | `src/lib/notifications/push.ts` | Configured (Vercel) | Behavioral test passes with mock payloads | **CODE PRESENT** |
| **GitHub Actions Cron** | Safe Walk & Escalation Scheduler | `.github/workflows/safe-walk-scheduler.yml` | **MISSING in Secrets** | Unit test passes; live runs await secret | **CONFIGURATION MISSING** |

---

## 2. Environment Variables Audit (Secret Names Only)

### Present & Verified in Vercel Production Environment:
- `TWILIO_PHONE_NUMBER`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `FCM_PRIVATE_KEY`
- `FIREBASE_PRIVATE_KEY`
- `FCM_CLIENT_EMAIL`
- `FIREBASE_CLIENT_EMAIL`
- `FCM_PROJECT_ID`
- `FIREBASE_PROJECT_ID`
- `ENABLE_REAL_EMAIL_DELIVERY`
- `SMTP_PASS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_URL`

### Missing / Required Owner Action:
- **`CRON_SECRET`**: Required in Vercel Production Environment Variables and in GitHub Repository Secrets (`Settings -> Secrets and variables -> Actions`).
