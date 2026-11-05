# KAVACH CAMPUS — ENVIRONMENT CONFIGURATION AUDIT

**Workspace:** `D:\kavach-campus`  
**Date:** 2026-11-05  
**Audit Policy:** Zero Secret Exposure (All tokens, hashes, and API keys masked)  

---

## 1. Overview & Security Mandate

This audit verifies all environment configurations required for local development, multi-device testing, and production deployment. In accordance with security protocols:
* No raw secret keys, credentials, or private tokens are displayed.
* Values are classified by sensitivity and scope (client-exposed vs. server-only).
* The demo testing configuration is audited to ensure zero-cost local operation without external paid SMS charges.

---

## 2. Environment Variables Specification Matrix

| Variable Name | Scope | Sensitivity | Purpose & Local Handling |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Low | Base URL for Supabase API gateway. Scoped to `http://127.0.0.1:54321` locally or remote project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Low | Supabase anonymous public API key, subject to PostgreSQL RLS policies. |
| `NEXT_PUBLIC_SITE_URL` | Public (Client + Server) | Low | Canonical domain for OAuth redirect resolution (`http://localhost:3000` or `https://kavach-campus.vercel.app`). |
| `NEXT_PUBLIC_DEFAULT_COLLEGE_ID` | Public (Client + Server) | Low | Default college tenant identifier for self-registration fallback (e.g., `srkr`). |
| `NEXT_PUBLIC_FIREBASE_*` | Public (Client) | Low | Firebase client SDK initialization credentials for FCM Web Push notifications. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | **CRITICAL** | High-privilege key bypassing RLS. Used exclusively in `/api/admin/*`, `/api/cron/*`, and auth callbacks. |
| `GOOGLE_CLIENT_ID` | Server-Only | Medium | Google Cloud OAuth 2.0 Web Client ID. Masked: `***.apps.googleusercontent.com`. |
| `GOOGLE_CLIENT_SECRET` | Server-Only | **HIGH** | Google Cloud OAuth 2.0 Client Secret for direct token exchange. Masked. |
| `GEMINI_API_KEY` | Server-Only | **HIGH** | Google AI Studio key for incident severity and routing analysis. Masked. |
| `TWILIO_ACCOUNT_SID` | Server-Only | Medium | Twilio provider SID for SMS emergency dispatches. Optional in dev. |
| `TWILIO_AUTH_TOKEN` | Server-Only | **HIGH** | Twilio auth token. Optional in dev (demo SMS fallback active). |
| `TWILIO_PHONE_NUMBER` | Server-Only | Low | Twilio dispatch phone number in E.164 format. |
| `CRON_SECRET` | Server-Only | **HIGH** | Bearer token authenticating Vercel cron triggers (`/api/cron/escalate`, `/api/cron/safe-walk-timeout`). |
| `ENABLE_DEMO_OTP` | Server-Only | Low | **TRUE** in dev. Enforces fixed demo OTP `123456` for deterministic testing. |
| `ENABLE_DEMO_SMS` | Server-Only | Low | **TRUE** in dev. Simulates SMS dispatch in server console with ₹0 cost. |

---

## 3. Demo Mode & Cost Protection Audit

* **Demo OTP (`123456`):**
  - Controlled by `ENABLE_DEMO_OTP=true`.
  - When enabled, any student or staff member verifying an OTP can use `123456` instantly.
  - Automatically disabled in production environments (`NODE_ENV === 'production'` requires cryptographically random 6-digit tokens).
* **Simulated SMS Dispatch (`₹0 Free Simulation`):**
  - Controlled by `ENABLE_DEMO_SMS=true`.
  - When SMS triggers occur (registration, password reset, emergency alerts), messages are formatted and printed cleanly to the server terminal.
  - Guarantees zero Twilio billable SMS API calls during development and automated Vitest runs.

---

## 4. Multi-Device Network Configuration

To enable mobile devices on the same Wi-Fi network to connect:
* The Next.js dev server is configured to bind to `0.0.0.0`:
  ```json
  "dev": "next dev --hostname 0.0.0.0"
  ```
* The local machine's IPv4 address (`192.168.1.7`) is used by mobile browsers:
  `http://192.168.1.7:3000`
* Client-side Supabase URL checking in `src/lib/supabase/client.ts` explicitly allows `http://192.168.` private class-C subnets.

