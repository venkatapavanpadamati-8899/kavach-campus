# KAVACH CAMPUS — OWNER ACTION REQUIRED (EXTERNAL CONFIGURATION CHECKLIST)

**Document Date:** 2026-11-03  
**Status:** All code-level repairs and 696 automated tests are passing. The items below require manual owner action in external service dashboards and on physical smartphones.

---

## 1. Supabase Dashboard (Urgent: Fixes Google Login Localhost Redirect)

1. Open your **[Supabase Project Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll)**.
2. Navigate to **Authentication ➔ URL Configuration**.
3. Update **Site URL** from `http://localhost:3000` to:
   ```text
   https://kavach-campus.vercel.app
   ```
4. In the **Redirect URLs** allowlist, ensure the following 4 URLs are saved:
   ```text
   https://kavach-campus.vercel.app/api/auth/callback
   https://kavach-campus.vercel.app/**
   http://localhost:3000/api/auth/callback
   http://localhost:3000/**
   ```
5. Click **Save**.

---

## 2. Google Cloud Console (OAuth Client Credentials)

1. Open **[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Click on your **OAuth 2.0 Web Client ID**.
3. Under **Authorized redirect URIs**, verify that the Supabase callback URL is listed:
   ```text
   https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
   ```

---

## 3. GitHub Actions Secrets (Fixes Workflow #32 Failure)

1. Open your repository settings: **[GitHub Repo Settings ➔ Secrets and variables ➔ Actions](https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions)**.
2. Under **Repository secrets**, ensure these two secrets exist:
   * **`CRON_SECRET`**: Set to the exact same string configured in Vercel `CRON_SECRET`.
   * **`VERCEL_PROJECT_URL`**: `https://kavach-campus.vercel.app`
3. After saving, go to the **Actions** tab, select **Kavach Safe Walk & Escalation Scheduler**, and click **Run workflow**.

---

## 4. Twilio SMS Account (For Live Carrier Pilot)

* **Current Status:** Twilio account is in **Trial Mode**. Sending live SMS to unverified numbers returns `Error 572002`. The application currently uses ₹0 simulated SMS fallback (`ENABLE_DEMO_SMS=true`).
* **Production Action:** To send real SMS to any student phone number, upgrade the Twilio project to Pay-as-you-go and purchase a dedicated 10DLC or toll-free number.

---

## 5. Physical Smartphone Field Testing Checklist

Perform these hardware checks on physical mobile devices (Android and iOS):

- [ ] **Hardware GPS Lock:** Open `/student/sos` and `/student/safe-walk` outdoors on campus. Verify real GPS coordinates and accuracy (±5m–15m) are acquired.
- [ ] **Mobile Camera Permission:** Open `/student/safe-box` on mobile. Tap camera capture and verify the native camera opens and uploads photos.
- [ ] **Mobile Microphone Permission:** Open `/student/voice-report` on mobile. Record a 10-second voice complaint and verify playback and transcription.
- [ ] **Lock-Screen Push Notifications:** Register a physical device token and trigger an alert to verify the notification banner appears when the screen is locked.
- [ ] **Emergency Dialing (112):** Click the Emergency Call button and verify it launches the native phone dialer with 112 pre-filled.
