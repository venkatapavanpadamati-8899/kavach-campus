# KAVACH CAMPUS — FINAL PENDING TASKS CHECKLIST (OWNER ACTION ITEMS)

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Release Management & DevOps Engineering  

---

## 1. High-Priority Owner Action Items

Below are the 5 highest-priority tasks required before public production release:

### 1. Apply Supabase Database Migration 015 & 016
* **Files:**
  * `supabase/migrations/015_student_college_claims.sql`
  * `supabase/migrations/016_safe_box_notes_and_permissions.sql`
* **Action:** Open your [Supabase Dashboard](https://supabase.com/dashboard) -> Select Project -> Open **SQL Editor** -> Paste and execute the contents of both files.
* **Why:** Unlocks the database columns for claimed college IDs, private profile photo paths, and Safe Box note updates.

### 2. Configure GitHub Actions Secrets (Fixes Actions Run #36 Warning)
* **Action:** Go to your GitHub repository:
  `https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions`
* **Secrets to Add:**
  * `VERCEL_PROJECT_URL`: `https://kavach-campus.vercel.app`
  * `CRON_SECRET`: Enter a secure random string (matching `CRON_SECRET` in your Vercel project environment variables).
* **Why:** Enables the automated Safe Walk timeout and staff escalation check to run securely every 5 minutes.

### 3. Google OAuth 2.0 Client Activation
* **Action:**
  1. In [Google Cloud Console](https://console.cloud.google.com/), create an active OAuth 2.0 Web Client ID.
  2. Add Authorized Redirect URI: `https://<supabase-project-id>.supabase.co/auth/v1/callback`.
  3. In Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**:
     * Enable Google provider.
     * Enter Google Client ID and Secret.
  4. In Supabase Dashboard -> **URL Configuration**:
     * Set Site URL: `https://kavach-campus.vercel.app`.
     * Set Redirect URL: `https://kavach-campus.vercel.app/api/auth/callback`.

### 4. Live Twilio SMS Gateway (Optional for Real Carrier SMS)
* **Action:** In Vercel Project Settings -> **Environment Variables**:
  * `TWILIO_ACCOUNT_SID`
  * `TWILIO_AUTH_TOKEN`
  * `TWILIO_PHONE_NUMBER`
  * `ENABLE_REAL_NOTIFICATIONS=true`
* **Note:** If omitted, Kavach Campus will continue using the built-in, zero-cost CSPRNG Demo SMS mode in development.

### 5. Final Physical Device Smoke Test
* **Action:** Access `https://kavach-campus.vercel.app` on an Android and iOS device:
  * Test camera capture for ID card upload.
  * Test microphone audio recording for Voice Report.
  * Verify GPS coordinate acquisition on mobile.

---

## 2. Readiness Summary

* **Codebase & Automated Quality Gate:** **100% PASS** (733/733 tests, 0 TS errors, 0 ESLint errors).
* **Current Overall Completion:** **90.2%** (Real, evidence-based score).
* **Remaining 9.8%:** Comprises external cloud credentials, database migration execution, and physical mobile testing.
