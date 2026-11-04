# KAVACH CAMPUS — EXTERNAL SERVICES AUDIT REPORT
**Date:** November 2026  
**Auditor:** Senior DevOps & Cloud Integration Engineer  
**Scope:** Integration status, API key health, third-party services, and environment readiness  

---

## 1. External Integration Matrix

| Integration / Service | Operational Status | Mode | Purpose | Production Readiness |
| :--- | :---: | :---: | :--- | :--- |
| **Supabase Database & Auth** | **OPERATIONAL** | Live Cloud | Core PostgreSQL database, RLS, auth credentials | Production Active |
| **Google OAuth 2.0** | **CONFIGURED** | Live Cloud | Single Sign-On for campus Google accounts | Needs Authorized Redirect URI verification in Google Cloud Console |
| **Google Gemini AI** | **OPERATIONAL** | Live API | Automatic incident triage, severity classification, sentiment | Production Active (`gemini-2.5-flash` / `@google/genai`) |
| **Twilio SMS** | **SIMULATED** | Demo Mode (`₹0`) | Phone OTP dispatch & emergency contact alerts | Safe for local QA; requires paid Twilio SID/AuthToken for live SMS |
| **SendGrid / SMTP Email** | **SIMULATED** | Demo Mode | Institutional email verification OTP & escalation reports | Safe for local QA; requires production SMTP credentials for live delivery |
| **Firebase Cloud Messaging (FCM)** | **STANDBY** | HTTP v1 Ready | Real-time push notifications to web/mobile service workers | Requires service account JSON configuration before production push |
| **Vercel Hosting** | **OPERATIONAL** | Edge / Serverless | Production deployment target (`kavach-campus.vercel.app`) | Configured; awaiting final deployment approval |
| **Cron Escalation Jobs** | **OPERATIONAL** | API Endpoints | `/api/cron/escalate` & `/api/cron/safe-walk-timeout` | Ready for Vercel Cron or external webhook scheduler |

---

## 2. Integration Details & Safety Protocol

### 1. SMS Dispatch & Verification (`lib/demo-sms.ts`)
- **Current Mode:** `ENABLE_DEMO_SMS=true`, `ENABLE_DEMO_OTP=true`.
- **Behavior:** OTP codes are logged to the development console with a clear `[DEMO SMS DISPATCH - ₹0 FREE SIMULATION]` notice.
- **Safety Benefit:** Zero cost incurred during development and automated QA. No unsolicited messages sent to real phone numbers.

### 2. Email Delivery (`lib/notifications.ts`)
- **Current Mode:** `ENABLE_REAL_EMAIL_DELIVERY=false`.
- **Behavior:** Emails are rendered in memory and logged to server logs without sending over SMTP.
- **Production Switch:** Set `ENABLE_REAL_EMAIL_DELIVERY=true` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` when ready for live launch.

### 3. Firebase Cloud Messaging (FCM HTTP v1)
- **Current Status:** Gracefully degraded (`[NotificationDispatch] provider=FCM status=NOT_CONFIGURED`).
- **Safety:** The system handles absent FCM private keys without crashing or blocking incident creation.
- **Production Switch:** Place the Google Service Account private key into `FCM_PRIVATE_KEY` and set `FCM_CLIENT_EMAIL` and `FCM_PROJECT_ID`.

### 4. Google OAuth Redirect URIs
- Ensure the following redirect URIs are whitelisted in the Google Cloud Console:
  1. `http://localhost:3000/api/auth/callback`
  2. `https://<your-project>.supabase.co/auth/v1/callback`
  3. `https://kavach-campus.vercel.app/api/auth/callback`

