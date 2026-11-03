# KAVACH CAMPUS — REMAINING ISSUES & BLOCKERS REPORT

**Date:** 2026-11-03
**Status:** Code Repair Complete; External Dashboard Configuration & Physical Field Tests Pending.

---

## 1. External Service Configuration (Action Required by Project Owner)

The codebase has been 100% repaired and defensively hardened, but the live production environment requires these external dashboard configurations:

### A. Supabase Authentication URL Configuration (Critical for Google Login)
* **Problem:** If Supabase's Site URL is left at `http://localhost:3000`, Google OAuth redirects authenticated users back to `http://localhost:3000/?code=...` with `ERR_CONNECTION_REFUSED`.
* **Required Dashboard Action:**
  1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll).
  2. Navigate to **Authentication ➔ URL Configuration**.
  3. Change **Site URL** to:
     ```text
     https://kavach-campus.vercel.app
     ```
  4. In **Redirect URLs**, add the following 4 URLs and click **Save**:
     ```text
     https://kavach-campus.vercel.app/api/auth/callback
     https://kavach-campus.vercel.app/**
     http://localhost:3000/api/auth/callback
     http://localhost:3000/**
     ```

### B. Google Cloud Console Credentials (OAuth Client ID)
* **Required Dashboard Action:**
  1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
  2. Select your OAuth 2.0 Web Client ID.
  3. Under **Authorized redirect URIs**, ensure this Supabase callback URL is present:
     ```text
     https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
     ```

### C. GitHub Actions Secrets (Fixes Workflow #32)
* **Problem:** `.github/workflows/safe-walk-scheduler.yml` run #32 exited code 1 because `VERCEL_PROJECT_URL` or `CRON_SECRET` was missing.
* **Required Dashboard Action:**
  1. Open [GitHub Repository Settings ➔ Secrets and variables ➔ Actions](https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions).
  2. Add under **Repository secrets**:
     * **`CRON_SECRET`**: Set to the exact same string configured in Vercel.
     * **`VERCEL_PROJECT_URL`**: `https://kavach-campus.vercel.app`

### D. Twilio SMS Account (Operational Carrier Limitation)
* **Status:** Twilio account is in **Trial Mode**. Sending live SMS to unverified phone numbers returns `Twilio Error 572002`.
* **Mitigation:** The application safely falls back to ₹0 simulated SMS (`ENABLE_DEMO_SMS=true`).
* **Required for Live Carrier Pilot:** Upgrade the Twilio project to Pay-as-you-go and purchase a dedicated toll-free / 10DLC number.

---

## 2. Physical Device Field Testing (Hardware Required)

Automated testing on CI/CD and emulators cannot verify real physical hardware interfaces. The following manual checks must be performed on physical smartphones:

1. **Physical GPS Satellite Lock:**
   * Test `/student/sos` and `/student/safe-walk` on Android Chrome and iOS Safari outdoors on campus.
   * Verify real hardware coordinates (`latitude`, `longitude`, `accuracy`) update dynamically as the student moves.
2. **Mobile Camera & Microphone Permissions:**
   * Verify native permission prompt behavior for `/student/safe-box` (camera/file upload) and `/student/voice-report` (audio recording).
3. **Lock-Screen Push Notifications:**
   * Register a physical device token and trigger an alert to verify banner display on locked screens.
4. **Emergency 112 Dialing Interface:**
   * Confirm that clicking the emergency call action opens the native phone dialer with `tel:112`.
