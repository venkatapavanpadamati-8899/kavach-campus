# KAVACH CAMPUS — FINAL REMAINING TASKS & RELEASE CHECKLIST

**Project Location:** `D:\Kavach Campus`  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Release Management & DevOps Engineering  

---

## 1. The 5 Highest-Priority Tasks for Launch

### 1. Apply Supabase Database Migrations 015 & 016
* **Files:**
  * `supabase/migrations/015_student_college_claims.sql`
  * `supabase/migrations/016_safe_box_private_notes.sql`
* **Action:** Go to [Supabase Dashboard](https://supabase.com/dashboard) -> SQL Editor -> Run both files.

### 2. Configure GitHub Actions Secrets
* **Repository Settings:** `https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions`
* **Secrets to Add:**
  * `VERCEL_PROJECT_URL`: `https://kavach-campus.vercel.app`
  * `CRON_SECRET`: Enter a secure random string (matching Vercel's `CRON_SECRET`).

### 3. Google Cloud OAuth 2.0 Client Activation
* **Action:** In Google Cloud Console, create OAuth Web Client with Redirect URI: `https://<supabase-project-id>.supabase.co/auth/v1/callback`.
* In Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**: Add Client ID and Client Secret.

### 4. Real Twilio SMS Gateway (Optional for Live Carrier Delivery)
* **Action:** In Vercel Project Settings -> **Environment Variables**: Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `ENABLE_REAL_NOTIFICATIONS=true`.

### 5. Physical Mobile Device Testing
* **Action:** Open `https://kavach-campus.vercel.app` on an Android and iOS device to verify camera ID card capture, microphone audio recording, and GPS location lock.

---

## 2. Release Status Verdict

* **Staging Readiness:** **READY FOR STAGING**
* **Public Production Readiness:** **NOT READY FOR PUBLIC PRODUCTION** (until the 5 external tasks above are completed by the project owner).

