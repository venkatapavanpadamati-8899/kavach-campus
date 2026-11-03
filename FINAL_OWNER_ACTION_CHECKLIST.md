# KAVACH CAMPUS — FINAL OWNER ACTION CHECKLIST FOR PRODUCTION LAUNCH

**Project Location:** `D:\Kavach Campus`  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Release Management & DevOps Engineering  

Follow this checklist to move the project from **READY FOR STAGING** to **FULLY LIVE IN PUBLIC PRODUCTION**.

---

## 1. Action 1: Add GitHub Actions Secrets (Estimated Time: 2 mins)
* **Where:** [GitHub Actions Secrets Settings](https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions)
* **Steps:**
  1. Click **"New repository secret"**.
  2. **Secret 1:**
     * **Name:** `CRON_SECRET`
     * **Value:** A secure random 32+ character string (e.g. `kavach_campus_secure_cron_2026_prod`).
  3. **Secret 2:**
     * **Name:** `VERCEL_PROJECT_URL`
     * **Value:** `https://kavach-campus.vercel.app`
  4. Click **"Add secret"**.
* **Result:** Safe Walk and Staff Escalation schedulers will begin executing real 5-minute HTTP health and timeout checks instead of skipping.

---

## 2. Action 2: Add `CRON_SECRET` to Vercel (Estimated Time: 1 min)
* **Where:** Vercel Dashboard -> Project `kavach-campus` -> Settings -> Environment Variables
* **Steps:**
  1. Key: `CRON_SECRET`
  2. Value: Enter the **exact same secret value** used in GitHub Secrets.
  3. Environments: Check **Production** and **Preview**.
  4. Click **"Save"**.
* **Result:** Allows the Next.js API endpoints (`/api/cron/safe-walk-timeout` and `/api/cron/escalate`) to authenticate requests sent by GitHub Actions.

---

## 3. Action 3: Execute Supabase Migrations 015 & 016 (Estimated Time: 3 mins)
* **Where:** [Supabase Dashboard](https://supabase.com/dashboard) -> SQL Editor
* **Steps:**
  1. Click **"New query"**.
  2. Paste the contents of `supabase/migrations/015_student_college_claims.sql` and click **"Run"**.
  3. Click **"New query"**.
  4. Paste the contents of `supabase/migrations/016_safe_box_private_notes.sql` and click **"Run"**.
* **Result:** Activates `claimed_college_id`, provisions private bucket `kavach-profile-photos`, and creates `safe_box_private_notes` with verified owner-only RLS policies.

---

## 4. Action 4: Configure Google Cloud OAuth (Estimated Time: 4 mins)
* **Where:** Google Cloud Console & Supabase Dashboard
* **Steps:**
  1. In [Google Cloud Console](https://console.cloud.google.com/) -> APIs & Services -> Credentials:
     * Create an OAuth 2.0 Web Client.
     * Authorized JavaScript origins: `https://kavach-campus.vercel.app`.
     * Authorized redirect URI: `https://polbvfmsffxeyoovgkgt.supabase.co/auth/v1/callback`.
  2. In [Supabase Dashboard](https://supabase.com/dashboard) -> Authentication -> Providers -> Google:
     * Enable Google Provider.
     * Enter the Google Client ID and Google Client Secret.
     * Click **"Save"**.
  3. In Supabase Dashboard -> Authentication -> URL Configuration:
     * Site URL: `https://kavach-campus.vercel.app`
     * Redirect URLs: Add `https://kavach-campus.vercel.app/api/auth/callback`.
* **Result:** Students and staff can sign in with one tap using their verified Google accounts.

---

## 5. Action 5 (Optional): Activate Live Carrier SMS (Estimated Time: 1 min)
* **Where:** Vercel Dashboard -> Settings -> Environment Variables
* **Steps:**
  1. Add Key: `ENABLE_REAL_NOTIFICATIONS`
  2. Value: `true`
  3. Environments: Check **Production**.
* **Result:** SMS dispatches will be delivered to real cellular carrier networks via Twilio. (Leave un-set for ₹0 free demo OTP simulation during staging tests).

---

## 6. Action 6: Physical Mobile Device Walkthrough (Estimated Time: 5 mins)
* **Steps:**
  1. Open `https://kavach-campus.vercel.app` on an Android and iOS device.
  2. Complete mobile login with demo OTP.
  3. Test Camera ID capture at `/student/verify-id`.
  4. Test Audio Voice Report at `/student/voice-report`.
  5. Test GPS signal lock at `/student/sos`.
* **Result:** Validates hardware sensor permissions (camera, microphone, geolocation) in real-world environments.
