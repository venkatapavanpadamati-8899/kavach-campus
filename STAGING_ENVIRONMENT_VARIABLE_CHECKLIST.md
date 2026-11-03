# KAVACH CAMPUS — STAGING ENVIRONMENT VARIABLE AUDIT & CHECKLIST

**Project Location:** `D:\Kavach Campus`  
**Target Environments:** Local (.env.local), Vercel Preview (Staging), Vercel Production  
**Audit Timestamp:** 2026-11-03T18:00:00+05:30  
**Security Standard:** Zero plaintext secret exposure. Values are verified for existence, length, and format only.

---

## 1. Environment Variable Audit Matrix

| Variable Name | Required Scope | Local (.env.local) | Vercel Staging (Preview) | Vercel Production | Format & Validation Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`NEXT_PUBLIC_SUPABASE_URL`** | Client & Server | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Points to valid HTTPS Supabase project host. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**| Client & Server | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Present; valid token format. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Server Only | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Configured as Vercel Secret for server-side privilege execution. |
| **`CRON_SECRET`** | Scheduler / Cron | **CONFIGURED** | **MISSING** | **MISSING** | Present in `.env.local` (length: 35 chars). **Must be added to Vercel & GitHub Actions Secrets.** |
| **`GOOGLE_CLIENT_ID`** | Auth / OAuth 2.0| **CONFIGURED** | **MISSING** | **CONFIGURED** | Present locally and in Vercel Production. Missing in Vercel Preview (Staging). |
| **`GOOGLE_CLIENT_SECRET`** | Auth / OAuth 2.0| **CONFIGURED** | **MISSING** | **CONFIGURED** | Present locally and in Vercel Production. Missing in Vercel Preview (Staging). |
| **`TWILIO_ACCOUNT_SID`** | SMS Dispatch | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Starts with valid Twilio prefix `AC` (34 chars). |
| **`TWILIO_AUTH_TOKEN`** | SMS Dispatch | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Present as Vercel Secret (32 chars). |
| **`TWILIO_PHONE_NUMBER`** | SMS Dispatch | **CONFIGURED** | **CONFIGURED** | **CONFIGURED** | Configured in Vercel (10 digits). Note: Carrier delivery requires E.164 (`+91...`). |
| **`GEMINI_API_KEY`** | AI Severity / Triage| **CONFIGURED** | **MISSING** | **MISSING** | Present locally (53 chars). Missing in Vercel Preview & Production. System safely falls back to deterministic rule engine. |

---

## 2. Additional Supporting Variables Verified

| Variable Name | Scope | Staging Status | Behavioral Function |
| :--- | :---: | :---: | :--- |
| **`ENABLE_REAL_NOTIFICATIONS`** | Server | **DISABLED (Unset)** | Set to `false` by default to prevent unintended emergency dispatch during testing. |
| **`ENABLE_REAL_EMAIL_DELIVERY`**| Server | **CONFIGURED (`true`)** | Enabled on Vercel for authentic email verification and password reset links. |
| **`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`** | Server | **CONFIGURED** | Provisioned in Vercel Production & Preview for email OTP dispatch. |
| **`FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL`** | Server | **CONFIGURED** | Firebase Push Notification credentials provisioned in Vercel. |

---

## 3. Immediate Staging Action Required

To make Staging (Vercel Preview) fully mirror production:
1. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the **Preview** environment in Vercel Project Settings.
2. Add `CRON_SECRET` to **Production** and **Preview** in Vercel, and add the exact same value to **GitHub Repository Secrets** (`Settings -> Secrets and variables -> Actions`).
3. Add `GEMINI_API_KEY` to Vercel if live AI incident summarization is desired (otherwise rule-based classification operates cleanly).
